// services/ai/ocr.ts
//
// OCR 100% on-device con Google ML Kit. La imagen NUNCA sale del dispositivo:
// se reconoce el texto localmente y solo el texto ya redactado se usa después.
//
// ML Kit devuelve las coordenadas (bounding boxes) de cada palabra. Aquí se
// usan para reconstruir la ESTRUCTURA de filas y columnas del extracto: sin
// esto, en tablas escaneadas cada columna llega como una línea suelta y el
// parser no puede mapear fecha / monto / descripción.

import TextRecognition, {
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";

export class OcrUnavailableError extends Error {
  constructor() {
    super(
      "El OCR local no está disponible. Reconstruye la app con el dev client después de instalar @react-native-ml-kit/text-recognition.",
    );
    this.name = "OcrUnavailableError";
  }
}

export interface OcrResult {
  text: string;
  lineCount: number;
}

interface OcrWord {
  text: string;
  left: number;
  top: number;
  right: number;
  height: number;
}

// Agrupa las palabras por su coordenada Y para reconstruir FILAS y, dentro de
// cada fila, separa COLUMNAS según los huecos horizontales. El resultado usa
// el separador " | " que ya entiende `parseStatement`.
const groupWordsIntoRows = (words: OcrWord[]): string[] => {
  if (words.length === 0) return [];

  const heights = words
    .map((w) => w.height)
    .filter((h) => typeof h === "number" && h > 0)
    .sort((a, b) => a - b);
  const medianHeight = heights.length
    ? heights[Math.floor(heights.length / 2)]
    : 16;
  const rowTolerance = Math.max(2, Math.round(medianHeight * 0.5));
  const columnGap = Math.max(12, Math.round(medianHeight * 1.2));

  const rows: { top: number; words: OcrWord[] }[] = [];
  for (const word of words) {
    // Tolerancia INCLUSIVA en el borde: dos palabras a exactamente
    // rowTolerance de distancia siguen siendo de la misma fila.
    const row = rows.find((r) => Math.abs(r.top - word.top) <= rowTolerance);
    if (row) row.words.push(word);
    else rows.push({ top: word.top, words: [word] });
  }

  rows.sort((a, b) => a.top - b.top);

  const out: string[] = [];
  for (const row of rows) {
    row.words.sort((a, b) => a.left - b.left);
    let text = "";
    let prevRight = Number.NEGATIVE_INFINITY;
    for (const w of row.words) {
      if (prevRight !== Number.NEGATIVE_INFINITY && w.left - prevRight > columnGap) {
        text += " | ";
      } else if (text) {
        text += " ";
      }
      text += w.text;
      prevRight = Math.max(prevRight, w.right);
    }
    if (text) out.push(text);
  }
  return out;
};

export const recognizeImageText = async (uri: string): Promise<OcrResult> => {
  if (!uri) throw new Error("Sin imagen seleccionada");

  let result;
  try {
    result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
  } catch (error: any) {
    if (
      String(error?.message ?? "").includes("doesn't seem to be linked") ||
      String(error?.message ?? "").includes("new Proxy")
    ) {
      throw new OcrUnavailableError();
    }
    throw new Error(`No se pudo procesar la imagen: ${error?.message ?? "error"}`);
  }

  const words: OcrWord[] = [];

  for (const block of result?.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const elements = line.elements ?? [];
      if (elements.length > 0) {
        for (const el of elements) {
          const text = (el.text ?? "").trim();
          if (!text) continue;
          const f = el.frame;
          if (f) {
            words.push({
              text,
              left: f.left,
              top: f.top,
              right: f.left + f.width,
              height: f.height,
            });
          } else {
            words.push({ text, left: 0, top: 0, right: 0, height: 0 });
          }
        }
      } else {
        const text = (line.text ?? "").trim();
        if (text) {
          words.push({ text, left: 0, top: 0, right: 0, height: 0 });
        }
      }
    }
  }

  // Palabras con coordenadas (frame) y sin ellas. Las primeras se reconstruyen
  // en filas/columnas ORDENADAS por su posición real; las segundas (raras) se
  // anexan al final en el orden en que ML Kit las devolvió. Si ninguna trae
  // coordenadas, se usa el texto tal como lo devuelve ML Kit.
  const framed = words.filter((w) => w.height > 0);
  const unframed = words.filter((w) => w.height <= 0);
  const lines =
    framed.length > 0
      ? [...groupWordsIntoRows(framed), ...unframed.map((w) => w.text)]
      : words.map((w) => w.text);

  const text = lines.join("\n").trim();
  return { text, lineCount: lines.length };
};
