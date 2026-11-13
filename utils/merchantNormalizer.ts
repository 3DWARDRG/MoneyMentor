// utils/merchantNormalizer.ts
//
// Normalización del nombre de un comercio a partir de una descripción.
// 100% pura (sin DB): el MISMO comercio produce SIEMPRE la misma clave,
// sin importar el ruido del OCR ni los prefijos del banco.

const normalizeForMerchant = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[ñ]/g, "n");

// Verbos/prefijos de banco que no aportan al nombre del comercio.
const MERCHANT_PREFIX =
  /^(?:pago|pagos|compra|compras|recarga|recargas|retiro|retiros|debito|debitos|cargo|cargos|cobro|cobros|consignacion|consignaciones|transferencia|transferencias|transf|abono|abonos|ingreso|ingresos|interes|intereses|cuota|cuotas|transaccion|transacciones|movimiento|movimientos|avance|giro|giros|suscripcion|suscripciones|factura|facturas|impuesto|impuestos|enviad[oa]|nota|referencia|folio)\b(?:\s+(?:de|en|a|al|del|por|para|hacia|con))?\s*/gi;

// Sufijos/etiquetas de canal o tipo de pago que no aportan al comercio.
const MERCHANT_SUFFIX =
  /\s+(?:por\s+)?(?:internet|web|online|en\s+linea|pse|con\s+tarjeta|sin\s+tarjeta|cajero|cajeros|atm|atms|automatico|automatica|referencia|ref|folio|cliente|gracias|del\s+mes|mensual|anual)\b/gi;

const GENERIC_MERCHANT =
  /^(?:movimiento|ingreso|efectivo|cajero|varios|mercancias?|nota|compra|pago|transferencia|cuenta|cuotas?)$/;

// Palabras cortas de relleno que no distinguen comercios.
const MERCHANT_STOPWORDS = new Set([
  "en",
  "de",
  "la",
  "el",
  "los",
  "las",
  "del",
  "al",
  "para",
  "por",
  "con",
  "un",
  "una",
  "a",
  "y",
]);

export const normalizeMerchant = (description: string): string | null => {
  if (!description) return null;

  let s = normalizeForMerchant(description)
    .replace(/\u00a0/g, " ")
    .replace(/[*#+\-_=/\\|·•:;,.()\[\]{}$%&@!?'"~]/g, " ")
    // Cuotas/porcentajes y gravámenes: "4x1000", "4 x 1000", "por mil".
    .replace(/4\s*x\s*1?\.?000|por\s+mil|gravamen\s+financiero/g, " ")
    // Códigos de referencia: "REF 1234", "NR 5255", "*5255", "1234567890".
    .replace(/\b(?:ref|nr|nro|num|folio)\s*\d*\b/gi, " ")
    .replace(/\*?\d{3,}/g, " ");

  // Quita prefijos de banco de forma iterativa ("Pago de compra en ...").
  for (let i = 0; i < 3; i += 1) {
    const next = s.replace(MERCHANT_PREFIX, "");
    if (next === s) break;
    s = next;
  }
  s = s.replace(MERCHANT_SUFFIX, "");

  const words = s
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !MERCHANT_STOPWORDS.has(w));
  const merchant = words.join(" ").slice(0, 40).trim();

  if (merchant.length < 2) return null;
  if (GENERIC_MERCHANT.test(merchant)) return null;
  return merchant;
};
