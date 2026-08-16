// services/ai/pdf.ts
//
// Extracción de texto de PDFs de extractos bancarios, 100% on-device con
// PDF.js. El archivo NUNCA sale del dispositivo. Si el PDF es un escaneo
// (sin capa de texto), la extracción devuelve texto vacío y se le pide al
// usuario usar imágenes en su lugar.
//
// PDF.js usa APIs que Hermes/React Native aún no implementan; aquí se
// aplican los polyfills mínimos (Buffer ya está global en app/_layout).
// El "worker" se inyecta en el mismo hilo vía globalThis.pdfjsWorker para
// evitar el import() dinámico que Metro no puede resolver.

import { File } from "expo-file-system/next";

let polyfillsReady = false;
let workerWired = false;
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

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
        ~buffer &&
        ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
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
        (output += map.charAt(63 & (block >> (8 - (i % 1) * 8))))
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

export const extractPdfText = async (uri: string): Promise<string> => {
  if (!uri) throw new PdfError("Sin documento seleccionado");
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
    }).promise;
  } catch (error: any) {
    throw new PdfError(`No se pudo abrir el PDF: ${error?.message ?? "error"}`);
  }

  const lines: string[] = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      let current = "";
      for (const item of content.items as any[]) {
        if (typeof item?.str === "string") current += item.str;
        if (item?.hasEOL) {
          lines.push(current);
          current = "";
        }
      }
      if (current.trim()) lines.push(current);
    }
  } catch (error: any) {
    throw new PdfError(`No se pudo leer el contenido del PDF: ${error?.message ?? "error"}`);
  } finally {
    await doc?.destroy();
  }

  return lines.join("\n");
};
