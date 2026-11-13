// services/ai/pdfRenderer.ts
//
// Rasterización de páginas de PDF con pdf.js dentro de un WebView.
//
// Muchos extractos bancarios (Bancolombia, Nu, Nequi…) NO tienen capa de texto
// y dibujan los datos como GLYFOS VECTORIALES (trazos), no como imágenes
// incrustadas ni texto extraíble. Extraer imágenes + OCR solo obtiene la
// plantilla (logos/formato). La forma de leer esos PDFs es DIBUJAR la página
// (rasterizar vectores + imágenes) y pasarle el resultado al OCR local.
//
// El navegador de un WebView sí tiene <canvas>, así que se inyecta pdf.js en
// un WebView oculto: recibe el PDF en base64, renderiza cada página a canvas,
// devuelve la página como PNG en base64, y ese PNG se guarda en caché y se
// manda a ML Kit (mismo flujo que una imagen de galería).
//
// Nada sale del dispositivo: pdf.js se lee de los assets de la app.

// ---------------------------------------------------------------------------
// Contrato del puente (lo implementa el componente PdfRasterizerBridge)
// ---------------------------------------------------------------------------

export interface PdfRasterizerBridge {
  /** Pide al WebView renderizar el PDF en base64. */
  render: (
    base64: string,
    scale: number,
  ) => void;
}

let bridge: PdfRasterizerBridge | null = null;
let htmlPromise: Promise<string> | null = null;

let pending:
  | { resolve: (pages: string[]) => void; reject: (err: Error) => void; pages: string[] }
  | null = null;

export const registerBridge = (b: PdfRasterizerBridge | null) => {
  bridge = b;
};

export const isRasterizerReady = () => bridge !== null;

/**
 * Procesa los mensajes que llegan del WebView (protocolo JSON en
 * `onMessage`). Lo invoca el componente PdfRasterizerBridge.
 */
export const handleBridgeMessage = (raw: string) => {
  let msg: { type?: string; page?: number; dataUrl?: string; message?: string };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "page":
      if (pending && typeof msg.dataUrl === "string") {
        pending.pages.push(msg.dataUrl);
      }
      break;
    case "done":
      if (pending) {
        const p = pending;
        pending = null;
        p.resolve(p.pages);
      }
      break;
    case "error":
      if (pending) {
        const p = pending;
        pending = null;
        p.reject(new Error(msg.message || "Error rasterizando el PDF."));
      }
      break;
    default:
      break;
  }
};

/**
 * Rasteriza todas las páginas del PDF (base64) a PNG (base64 dataURL).
 * Resuelve con un arreglo de dataURLs (uno por página, en orden).
 */
export const rasterizePdf = (
  base64: string,
  scale = 2,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (!bridge) {
      reject(new Error("El renderizador de PDF no está disponible."));
      return;
    }
    pending = { resolve, reject, pages: [] };
    try {
      bridge.render(base64, scale);
    } catch (err: any) {
      pending = null;
      reject(err);
    }
  });
};

// ---------------------------------------------------------------------------
// Construcción del HTML del WebView (con pdf.js inyectado)
// ---------------------------------------------------------------------------

const readAssetContent = async (module: number): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Asset } = require("expo-asset") as typeof import("expo-asset");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readAsStringAsync } = require("expo-file-system") as typeof import("expo-file-system");
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("No se pudo leer el bundle de pdf.js.");
  return readAsStringAsync(uri);
};

let libContent: string | null = null;
let workerContent: string | null = null;

const getPdfjsContents = async (): Promise<{ lib: string; worker: string }> => {
  if (libContent && workerContent) return { lib: libContent, worker: workerContent };
  const [lib, worker] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    readAssetContent(require("../../assets/pdfjs/lib.jsbundle")),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    readAssetContent(require("../../assets/pdfjs/worker.jsbundle")),
  ]);
  libContent = lib;
  workerContent = worker;
  return { lib, worker };
};

const buildRendererHtml = (lib: string, worker: string): string => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#fff">
<script type="module">
${lib}
</script>
<script type="module">
${worker}
</script>
<script>
(function () {
  "use strict";
  var busy = false;
  function post(obj) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
  }
  function base64ToArrayBuffer(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  window.addEventListener("message", async function (e) {
    var data = e && e.data;
    if (!data || data.type !== "render" || busy) return;
    busy = true;
    try {
      var pdfjs = globalThis.pdfjsLib;
      var doc = await pdfjs.getDocument({
        data: base64ToArrayBuffer(data.base64),
        useSystemFonts: false,
        isEvalSupported: false,
        isOffscreenCanvasSupported: false,
        isImageDecoderSupported: false,
        disableFontFace: true
      }).promise;
      for (var p = 1; p <= doc.numPages; p++) {
        var page = await doc.getPage(p);
        var scale = data.scale || 2;
        var vp = page.getViewport({ scale: scale });
        var canvas = document.createElement("canvas");
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        var ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        post({ type: "page", page: p, dataUrl: canvas.toDataURL("image/png") });
      }
      try { await doc.destroy(); } catch (_) {}
      post({ type: "done" });
    } catch (err) {
      post({ type: "error", message: String((err && err.message) || err) });
    }
    busy = false;
  });
  post({ type: "ready" });
})();
</script>
</body>
</html>`;

/**
 * Devuelve el HTML del WebView (construido una sola vez, cacheado).
 */
export const getRendererHtml = (): Promise<string> => {
  htmlPromise ??= getPdfjsContents().then(({ lib, worker }) =>
    buildRendererHtml(lib, worker),
  );
  return htmlPromise;
};

// ---------------------------------------------------------------------------
// Utilidades base64 (sin dependencias nativas)
// ---------------------------------------------------------------------------

const B64_CHUNK = 0x8000;

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let result = "";
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    result += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + B64_CHUNK) as unknown as number[],
    );
  }
  return btoa(result);
};

export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
};
