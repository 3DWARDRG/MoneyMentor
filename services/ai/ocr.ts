// services/ai/ocr.ts
//
// OCR 100% on-device con Google ML Kit. La imagen NUNCA sale del dispositivo:
// se reconoce el texto localmente y solo el texto ya redactado se usa después.

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

const normalizeImagePath = (uri: string): string => {
  if (uri.startsWith("file://")) return uri.slice("file://".length);
  return uri;
};

export interface OcrResult {
  text: string;
  lineCount: number;
}

export const recognizeImageText = async (uri: string): Promise<OcrResult> => {
  if (!uri) throw new Error("Sin imagen seleccionada");
  const path = normalizeImagePath(uri);

  let result;
  try {
    result = await TextRecognition.recognize(path, TextRecognitionScript.LATIN);
  } catch (error: any) {
    if (
      String(error?.message ?? "").includes("doesn't seem to be linked") ||
      String(error?.message ?? "").includes("new Proxy")
    ) {
      throw new OcrUnavailableError();
    }
    throw new Error(`No se pudo procesar la imagen: ${error?.message ?? "error"}`);
  }

  const text = (result?.text ?? "").trim();
  const lineCount =
    result?.blocks?.reduce((acc, block) => acc + (block.lines?.length ?? 0), 0) ?? 0;

  return { text, lineCount };
};
