// services/ai/pdf.ts
//
// Extracción de texto de PDFs de extractos bancarios, 100% on-device con
// PDF.js. El archivo NUNCA sale del dispositivo.
//
// Dos casos de uso:
//   1. PDF con capa de texto: se extrae el texto directamente.
//   2. PDF escaneado (la página es una imagen): se extraen las imágenes
//      incrustadas en la página, se re-codifican como PNG en caché y se les
//      aplica el OCR local de ML Kit (nunca salen del dispositivo).
//
// PDF.js usa APIs que Hermes/React Native aún no implementan; aquí se
// aplican los polyfills mínimos (Buffer ya está global en app/_layout).
// El "worker" se inyecta en el mismo hilo vía globalThis.pdfjsWorker para
// evitar el import() dinámico que Metro no puede resolver.

import { File, Paths } from "expo-file-system/next";
import { recognizeImageText, OcrUnavailableError } from "./ocr";
import {
  rasterizePdf,
  bytesToBase64,
  dataUrlToBytes,
} from "./pdfRenderer";

let polyfillsReady = false;
let workerWired = false;
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

// Presupuesto total de OCR por archivo. Los PDFs escaneados (páginas que son
// una foto) pueden tardar mucho; si se pasa el límite se corta con un error
// claro en vez de dejar al usuario esperando sin fin.
const OCR_BUDGET_MS = 120_000;
// Momento en que empezó el procesamiento del archivo actual (0 = no activo).
let ocrDeadline = 0;

const isOcrOverBudget = () =>
  ocrDeadline > 0 && Date.now() - ocrDeadline > OCR_BUDGET_MS;

const getPdfjs = () => {
  pdfjsPromise ??= import("pdfjs-dist");
  return pdfjsPromise;
};

const wireWorker = async () => {
  if (workerWired) return;
  workerWired = true;
  // @ts-expect-error - el subpath no declara tipos; se usa por su efecto.
  const workerModule = await import("pdfjs-dist/build/pdf.worker.mjs");
  (globalThis as any).pdfjsWorker = workerModule;
};

const structuredCloneLike = (value: any, seen?: WeakMap<any, any>): any => {
  if (value === null || typeof value !== "object") return value;
  const seenMap = seen ?? new WeakMap();
  if (seenMap.has(value)) return seenMap.get(value);

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    const ctor = value.constructor as new (source: any) => any;
    const copy = new ctor(value);
    seenMap.set(value, copy);
    return copy;
  }
  if (value instanceof Array) {
    const copy: any[] = [];
    seenMap.set(value, copy);
    for (const item of value) copy.push(structuredCloneLike(item, seenMap));
    return copy;
  }
  if (value instanceof Map) {
    const copy = new Map();
    seenMap.set(value, copy);
    value.forEach((v, k) => copy.set(k, structuredCloneLike(v, seenMap)));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seenMap.set(value, copy);
    value.forEach((v) => copy.add(structuredCloneLike(v, seenMap)));
    return copy;
  }
  const copy: Record<string, any> = {};
  seenMap.set(value, copy);
  for (const key of Object.keys(value)) {
    copy[key] = structuredCloneLike(value[key], seenMap);
  }
  return copy;
};

const ensurePolyfills = () => {
  if (polyfillsReady) return;
  polyfillsReady = true;

  const g: any = globalThis;

  if (typeof (Promise as any).withResolvers !== "function") {
    (Promise as any).withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  if (typeof g.structuredClone !== "function") {
    g.structuredClone = (value: any) => structuredCloneLike(value);
  }

  if (typeof g.atob !== "function") {
    g.atob = (input: string) => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      const str = String(input).replace(/=+$/, "");
      let output = "";
      for (
        let bc = 0, bs = 0, buffer: any, idx = 0;
        (buffer = str.charAt(idx++));
        ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
          ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
          : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    };
  }

  if (typeof g.btoa !== "function") {
    g.btoa = (input: string) => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      let output = "";
      const str = String(input);
      for (
        let block = 0, charCode: any, i = 0, map = chars;
        str.charAt(i | 0) || ((map = "="), i % 1);
        output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
      ) {
        charCode = str.charCodeAt((i += 3 / 4));
        block = (block << 8) | charCode;
      }
      return output;
    };
  }

  if (typeof g.crypto?.getRandomValues !== "function") {
    const crypto = g.crypto ?? (g.crypto = {});
    crypto.getRandomValues = (array: Uint8Array) => {
      for (let i = 0; i < array.length; i += 1) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
};

export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfError";
  }
}

// ---------------------------------------------------------------------------
// Escaneos (páginas que son imágenes, sin capa de texto)
//
// Cuando una página no tiene texto, se extraen las imágenes XObject incrustadas
// (la típica foto del extracto), se re-codifican como PNG en el caché y se les
// aplica el OCR local de ML Kit. Nada sale del dispositivo.
// ---------------------------------------------------------------------------

// Opcodes de PDF.js para imágenes en el operator list de una página.
const OPS_PAINT_IMAGE = 85; // paintImageXObject
const OPS_PAINT_INLINE_IMAGE = 86; // paintInlineImageXObject
const OPS_PAINT_IMAGE_REPEAT = 88; // paintImageXObjectRepeat

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf: Uint8Array, start = 0, end = buf.length): number => {
  let c = -1;
  for (let i = start; i < end; i += 1) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
};

const adler32 = (buf: Uint8Array): number => {
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i += 1) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

const makePngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
};

// Stream zlib usando bloques "stored" (sin compresión): no requiere zlib nativo
// y produce un PNG válido que ML Kit puede leer.
const zlibStored = (raw: Uint8Array): Uint8Array => {
  const MAX = 65535;
  const numBlocks = Math.max(1, Math.ceil(raw.length / MAX));
  const total = 2 + numBlocks * 5 + raw.length + 4;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  out[0] = 0x78; // CMF: deflate, ventana 32K
  out[1] = 0x01; // FLG: sin compresión (0x7801 % 31 === 0)
  let pos = 2;
  let src = 0;
  for (let b = 0; b < numBlocks; b += 1) {
    const len = Math.min(MAX, raw.length - src);
    const final = src + len >= raw.length;
    out[pos++] = final ? 0x01 : 0x00; // BFINAL + BTYPE=00 (stored)
    out[pos++] = len & 0xff;
    out[pos++] = (len >> 8) & 0xff;
    out[pos++] = ~len & 0xff;
    out[pos++] = (~len >> 8) & 0xff;
    out.set(raw.subarray(src, src + len), pos);
    pos += len;
    src += len;
  }
  dv.setUint32(pos, adler32(raw));
  return out;
};

// Codifica pixeles (bpp 1=gray, 3=RGB, 4=RGBA) como PNG válido sin compresión.
const encodePng = (width: number, height: number, bpp: number, pixels: Uint8Array): Uint8Array => {
  const colorType = bpp === 1 ? 0 : bpp === 3 ? 2 : 6;
  const stride = width * bpp;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const dst = y * (stride + 1);
    raw[dst] = 0; // filtro "None"
    raw.set(pixels.subarray(y * stride, y * stride + stride), dst + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const chunks = [
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", zlibStored(raw)),
    makePngChunk("IEND", new Uint8Array(0)),
  ];
  const total = PNG_SIGNATURE.length + chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  out.set(PNG_SIGNATURE, pos);
  pos += PNG_SIGNATURE.length;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
};

const MAX_PIXELS = 4_000_000;

// Reduce imágenes muy grandes con PROMEDIADO DE ÁREA (box filter), no con
// vecino-cercano: al reducir, cada píxel de salida es el promedio de su región
// en el original, así los trazos finos del texto no desaparecen (el
// vecino-cercano los borra por aliasado).
const maybeDownscale = (
  width: number,
  height: number,
  bpp: number,
  pixels: Uint8Array,
): { width: number; height: number; pixels: Uint8Array } => {
  const px = width * height;
  if (px <= MAX_PIXELS) return { width, height, pixels };
  const ratio = Math.sqrt(MAX_PIXELS / px);
  const nw = Math.max(1, Math.floor(width * ratio));
  const nh = Math.max(1, Math.floor(height * ratio));
  const out = new Uint8Array(nw * nh * bpp);
  for (let y = 0; y < nh; y += 1) {
    const y0 = Math.floor((y * height) / nh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / nh));
    for (let x = 0; x < nw; x += 1) {
      const x0 = Math.floor((x * width) / nw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / nw));
      const area = (y1 - y0) * (x1 - x0);
      for (let c = 0; c < bpp; c += 1) {
        let sum = 0;
        for (let yy = y0; yy < y1; yy += 1) {
          const rowBase = yy * width * bpp;
          for (let xx = x0; xx < x1; xx += 1) {
            sum += pixels[rowBase + xx * bpp + c];
          }
        }
        out[(y * nw + x) * bpp + c] = Math.round(sum / area);
      }
    }
  }
  return { width: nw, height: nh, pixels: out };
};

// Convierte el imgData de PDF.js (kind 1=gray 1bpp, 2=RGB, 3=RGBA) a RGB plano.
const toRgb = (img: any): { width: number; height: number; pixels: Uint8Array } | null => {
  if (!img || !img.data || !img.width || !img.height) return null;
  const { width, height } = img;
  const kind = img.kind;
  if (kind === 2) {
    return maybeDownscale(width, height, 3, img.data);
  }
  if (kind === 3) {
    const n = width * height;
    const out = new Uint8Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      out[i * 3] = img.data[i * 4];
      out[i * 3 + 1] = img.data[i * 4 + 1];
      out[i * 3 + 2] = img.data[i * 4 + 2];
    }
    return maybeDownscale(width, height, 3, out);
  }
  if (kind === 1) {
    const out = new Uint8Array(width * height);
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byte = img.data[y * rowBytes + (x >> 3)];
        const bit = (byte >> (7 - (x & 7))) & 1;
        out[y * width + x] = bit ? 255 : 0;
      }
    }
    return maybeDownscale(width, height, 1, out);
  }
  return null;
};

// Espera a que PDF.js resuelva la imagen referenciada en el operator list.
// PDF.js guarda las imágenes en `page.objs` o en `commonObjs` (las que suelen
// tener id con prefijo "g_" y las de gran tamaño vía CopyLocalImage).
const waitForImage = async (page: any, objId: string, timeoutMs = 3000): Promise<any> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (page.objs.has(objId)) return page.objs.get(objId);
    if (page.commonObjs?.has(objId)) return page.commonObjs.get(objId);
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
};

// Devuelve las imágenes XObject incrustadas en la página (en orden de tamaño).
const extractPageImages = async (page: any): Promise<any[]> => {
  const images: any[] = [];
  let ops: any;
  try {
    ops = await page.getOperatorList();
  } catch {
    return images;
  }
  const { fnArray, argsArray } = ops;
  for (let i = 0; i < fnArray.length; i += 1) {
    const fn = fnArray[i];
    if (fn === OPS_PAINT_IMAGE || fn === OPS_PAINT_IMAGE_REPEAT) {
      const objId = argsArray[i][0];
      const img = await waitForImage(page, objId);
      if (img && img.data) images.push(img);
    } else if (fn === OPS_PAINT_INLINE_IMAGE) {
      const img = argsArray[i][0];
      if (img && img.data) images.push(img);
    }
  }
  return images;
};

// Rota una imagen 90° en sentido horario (para reintentar OCR de escaneos
// que vienen girados y, de lo contrario, ML Kit no devuelve nada).
const rotate90Cw = (
  width: number,
  height: number,
  bpp: number,
  pixels: Uint8Array,
): { width: number; height: number; pixels: Uint8Array } => {
  const nw = height;
  const nh = width;
  const out = new Uint8Array(nw * nh * bpp);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const si = (y * width + x) * bpp;
      const nx = height - 1 - y;
      const ny = x;
      const di = (ny * nw + nx) * bpp;
      for (let c = 0; c < bpp; c += 1) out[di + c] = pixels[si + c];
    }
  }
  return { width: nw, height: nh, pixels: out };
};

// OCR de una página escaneada: toma las imágenes más grandes (el scan del
// extracto) y las procesa con ML Kit. Devuelve el texto reconocido o "".
const ocrScannedPage = async (page: any, pageNum: number): Promise<string> => {
  const images = await extractPageImages(page);
  const candidates = images
    .map(toRgb)
    .filter(
      (x): x is { width: number; height: number; pixels: Uint8Array } =>
        !!x &&
        // Al menos 200px de alto Y de ancho: descarta franjas delgadas
        // (líneas/divisores gráficos). Las tiras anchas o altas que SÍ traen
        // contenido del extracto pasan.
        x.width >= 200 &&
        x.height >= 200,
    )
    .sort((a, b) => b.width * b.height - a.width * a.height);

  if (candidates.length === 0) return "";

  const ocrImage = async (
    cand: { width: number; height: number; pixels: Uint8Array },
    rotation: 0 | 90,
  ): Promise<string> => {
    if (isOcrOverBudget()) {
      throw new PdfError(
        "El archivo es muy pesado para el OCR local (más de 2 minutos). Prueba con capturas de pantalla de los movimientos.",
      );
    }
    let w = cand.width;
    let h = cand.height;
    let px = cand.pixels;
    if (rotation === 90) {
      const rotated = rotate90Cw(w, h, px.length / (w * h), px);
      w = rotated.width;
      h = rotated.height;
      px = rotated.pixels;
    }
    // Se conserva el formato original (RGB a color o gris 1bpp), igual que si
    // el usuario hubiera pasado la imagen directamente: sin pérdida de color.
    const bpp = px.length / (w * h);
    const png = encodePng(w, h, bpp, px);

    let file: File | null = null;
    try {
      file = new File(
        Paths.cache,
        `moneymentor_scan_${pageNum}_${rotation}_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
      );
      file.create({ overwrite: true, intermediates: true });
      file.write(png);
      const ocr = await recognizeImageText(file.uri);
      return (ocr?.text ?? "").trim();
    } finally {
      try {
        file?.delete();
      } catch {
        // limpieza best-effort
      }
    }
  };

  const parts: string[] = [];
  const seen = new Set<string>();
  // Máximo 3 imágenes por página (el scan del extracto y sus tiras). Procesar
  // más solo ralentiza el OCR.
  for (const cand of candidates.slice(0, 3)) {
    const key = `${cand.width}x${cand.height}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      let text = await ocrImage(cand, 0);
      // Escaneos rotados: si la orientación recta no devuelve texto, se
      // reintenta a 90°.
      if (!text) text = await ocrImage(cand, 90);
      if (text) parts.push(text);
    } catch (error: any) {
      if (error instanceof OcrUnavailableError) throw error;
      // Si una imagen falla (formato raro), se ignora y se sigue con las demás.
      console.warn(`OCR de página escaneada ${pageNum} falló:`, error?.message);
    }
  }

  if (parts.length === 0) {
    console.warn(`Página escaneada ${pageNum} no devolvió texto OCR.`);
  }

  return parts.join("\n");
};

export interface PdfPage {
  /** Número de página, 1-based. */
  page: number;
  /** Texto extraído (o OCR) de esa página, ya agrupado en filas. */
  text: string;
}

export const extractPdfPages = async (uri: string): Promise<PdfPage[]> => {
  if (!uri) throw new PdfError("Sin documento seleccionado");
  ocrDeadline = Date.now();
  ensurePolyfills();
  await wireWorker();

  let bytes: Uint8Array;
  try {
    bytes = new File(uri).bytes();
  } catch (error: any) {
    throw new PdfError(
      `No se pudo leer el PDF: ${error?.message ?? "archivo no disponible"}`,
    );
  }

  if (!bytes || bytes.length === 0) {
    throw new PdfError("El PDF está vacío o no se pudo leer.");
  }

  let doc: any;
  try {
    const pdfjs = await getPdfjs();
    doc = await pdfjs.getDocument({
      data: bytes,
      useSystemFonts: false,
      isEvalSupported: false,
      // En RN no existen OffscreenCanvas ni ImageDecoder; forzamos a PDF.js a
      // devolver los pixeles crudos de las imágenes (campo `data`) en lugar de
      // bitmaps, que es lo que necesita el OCR de páginas escaneadas.
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      // 1. Evita que intente renderizar fuentes en un Canvas (evita el crash del Bitmap)
      disableFontFace: true,
      // 2. Soluciona el UnknownErrorException proveyendo las fuentes estándar
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }).promise;
  } catch (error: any) {
    throw new PdfError(`No se pudo abrir el PDF: ${error?.message ?? "error"}`);
  }

  const pageTexts: (string | null)[] = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items as any[];

      // Tolerancia adaptativa según el tamaño de fuente mediano de la página:
      // páginas con tipografías grandes no deben fusionar renglones distintos.
      const heights = items
        .map((it) => it?.height ?? Math.abs(it?.transform?.[0] ?? 0))
        .filter((h) => typeof h === "number" && h > 0)
        .slice()
        .sort((a, b) => a - b);
      const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
      const TOLERANCE = Math.max(2, Math.round(medianHeight * 0.5));

      // Objeto para agrupar los textos según su altura (coordenada Y)
      const rows: { [y: string]: { text: string; x: number }[] } = {};

      for (const item of items) {
        // Asegurarnos de que es texto y tiene coordenadas
        if (typeof item?.str === "string" && item.transform) {
          // transform[4] es la posición X, transform[5] es la posición Y
          const x = Math.round(item.transform[4]);
          const y = Math.round(item.transform[5]);

          // Buscar si ya existe una fila en una altura muy similar
          const existingY = Object.keys(rows).find(
            (rowY) => Math.abs(Number(rowY) - y) < TOLERANCE,
          );
          const targetY = existingY ? existingY : y.toString();

          if (!rows[targetY]) {
            rows[targetY] = [];
          }

          rows[targetY].push({ text: item.str, x: x });
        }
      }

      // Ordenar las filas de arriba hacia abajo
      // (En los PDFs el origen Y=0 suele estar abajo, por lo que ordenamos descendente)
      const sortedY = Object.keys(rows)
        .map(Number)
        .sort((a, b) => b - a);

      const pageLines: string[] = [];
      for (const y of sortedY) {
        const rowItems = rows[y.toString()];

        // Ordenar los textos de la fila de izquierda a derecha (coordenada X)
        rowItems.sort((a, b) => a.x - b.x);

        // Limpiar espacios vacíos y unir las columnas con un separador claro " | "
        const rowText = rowItems
          .map((i) => i.text.trim())
          .filter((t) => t.length > 0)
          .join(" | ");

        if (rowText) {
          pageLines.push(rowText);
        }
      }

      // Detección de capa de texto REAL: si pdf.js devolvió texto crudo
      // suficiente (>50 caracteres), la página tiene capa de texto aunque el
      // agrupado de filas falle (PDFs híbridos con imagen de fondo). En ese
      // caso NUNCA se hace OCR de la imagen de fondo, que solo trae logo/agua
      // y hace que el OCR se cuelgue.
      const rawText = items
        .map((i: any) => i?.str ?? "")
        .join(" ")
        .trim();

      if (rawText.length > 50) {
        // Capa de texto: se usa el agrupado de filas (o el texto crudo como
        // respaldo si el agrupado falló).
        pageTexts.push(pageLines.length > 0 ? pageLines.join("\n") : rawText);
      } else {
        // Página sin capa de texto: necesita OCR (se resuelve abajo).
        pageTexts.push(null);
      }
    }

    // -----------------------------------------------------------------------
    // OCR de las páginas sin capa de texto.
    //   1º intento: rasterizar el PDF con pdf.js en el WebView (resuelve los
    //      bancos que dibujan el texto como VECTORES — Bancolombia, Nu, Nequi).
    //   2º intento (respaldo): OCR de las imágenes incrustadas en la página.
    // -----------------------------------------------------------------------
    const ocrIndexes = pageTexts
      .map((t, i) => (t === null ? i : -1))
      .filter((i) => i !== -1);

    if (ocrIndexes.length > 0) {
      let rasterDataUrls: string[] | null = null;
      try {
        rasterDataUrls = await rasterizePdf(bytesToBase64(bytes), 2);
      } catch (error: any) {
        console.warn(
          "Rasterización WebView no disponible, usando imágenes incrustadas:",
          error?.message,
        );
      }

      for (const idx of ocrIndexes) {
        const pageNum = idx + 1;
        let ocrText = "";
        try {
          if (rasterDataUrls && rasterDataUrls[idx]) {
            ocrText = await ocrPngBytes(pageNum, rasterDataUrls[idx]);
          }
          if (!ocrText) {
            const page = await doc.getPage(pageNum);
            ocrText = await ocrScannedPage(page, pageNum);
          }
        } catch (error: any) {
          if (error instanceof OcrUnavailableError) throw error;
          console.warn(`OCR página ${pageNum} falló:`, error?.message);
        }
        pageTexts[idx] = ocrText;
      }
    }
  } catch (error: any) {
    throw new PdfError(
      `No se pudo leer el contenido del PDF: ${error?.message ?? "error"}`,
    );
  } finally {
    await doc?.destroy();
  }

  return pageTexts
    .map((text, index) => ({ page: index + 1, text: text ?? "" }))
    .filter((p) => p.text.trim().length > 0);
};

export const extractPdfText = async (uri: string): Promise<string> => {
  const pages = await extractPdfPages(uri);
  return pages.map((p) => p.text).join("\n");
};

// OCR de un PNG en base64 (producido por la rasterización del WebView): se
// escribe en caché y se le pasa a ML Kit, igual que una imagen de galería.
const ocrPngBytes = async (
  pageNum: number,
  dataUrl: string,
): Promise<string> => {
  if (isOcrOverBudget()) {
    throw new PdfError(
      "El archivo es muy pesado para el OCR local (más de 2 minutos). Prueba con capturas de pantalla de los movimientos.",
    );
  }
  const bytes = dataUrlToBytes(dataUrl);
  let file: File | null = null;
  try {
    file = new File(
      Paths.cache,
      `moneymentor_raster_${pageNum}_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
    );
    file.create({ overwrite: true, intermediates: true });
    file.write(bytes);
    const ocr = await recognizeImageText(file.uri);
    return (ocr?.text ?? "").trim();
  } finally {
    try {
      file?.delete();
    } catch {
      // limpieza best-effort
    }
  }
};
