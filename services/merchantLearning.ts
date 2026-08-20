// services/merchantLearning.ts
//
// "Machine learning simulado", 100% local:
//   El usuario asigna descripción/categoría/tipo a un comercio en la
//   verificación de importaciones. Esto se guarda en la tabla
//   `merchant_learnings` (un diccionario por usuario) y se usa para
//   pre-llenar movimientos futuros del mismo comercio.
//
// No se entrena nada: son reglas deterministas de normalización de nombres de
// comercio + un diccionario persistente que el usuario construye con su uso.

import { Q } from "@nozbe/watermelondb";
import { database } from "@/database";
import { MerchantLearning } from "@/database/models/mlMerchantLearning";

// ---------------------------------------------------------------------------
// Normalización del nombre de un comercio a partir de una descripción.
// El objetivo es que el MISMO comercio produzca SIEMPRE la misma clave,
// sin importar el ruido del OCR ni los prefijos del banco.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Persistencia del diccionario
// ---------------------------------------------------------------------------

export interface MerchantLearningRow {
  merchantKey: string;
  merchantLabel: string;
  description: string | null;
  categoryId: string | null;
  type: "income" | "expense" | "transfer" | null;
  occurrences: number;
}

const toRow = (r: any): MerchantLearningRow => ({
  merchantKey: r.merchantKey,
  merchantLabel: r.merchantLabel,
  description: r.description ?? null,
  categoryId: r.categoryId ?? null,
  type: r.type ?? null,
  occurrences: r.occurrences ?? 0,
});

export const getMerchantLearning = async (
  userId: string,
  merchantKey: string,
): Promise<MerchantLearningRow | null> => {
  if (!userId || !merchantKey) return null;
  const rows = await database
    .get<MerchantLearning>("merchant_learnings")
    .query(Q.where("user_id", userId), Q.where("merchant_key", merchantKey))
    .fetch();
  return rows.length > 0 ? toRow(rows[0]) : null;
};

export const getMerchantLearningsByKeys = async (
  userId: string,
  keys: (string | null)[],
): Promise<Record<string, MerchantLearningRow>> => {
  const unique = [
    ...new Set(keys.filter((k): k is string => !!k)),
  ];
  if (!userId || unique.length === 0) return {};
  const rows = await database
    .get<MerchantLearning>("merchant_learnings")
    .query(Q.where("user_id", userId), Q.where("merchant_key", Q.oneOf(unique)))
    .fetch();
  const map: Record<string, MerchantLearningRow> = {};
  for (const r of rows) map[r.merchantKey] = toRow(r);
  return map;
};

interface LearnInput {
  merchantKey: string;
  merchantLabel: string;
  description: string | null;
  categoryId: string | null;
  type: "income" | "expense" | "transfer" | null;
}

const learnMerchant = async (userId: string, input: LearnInput) => {
  const collection = database.get<MerchantLearning>("merchant_learnings");
  const existing = await collection
    .query(Q.where("user_id", userId), Q.where("merchant_key", input.merchantKey))
    .fetch();

  await database.write(async () => {
    if (existing.length > 0) {
      await existing[0].update((r: any) => {
        r.merchantLabel = input.merchantLabel;
        r.description = input.description ?? null;
        r.categoryId = input.categoryId ?? null;
        r.type = input.type ?? null;
        r.occurrences = (r.occurrences ?? 0) + 1;
        r.updatedAt = Date.now();
      });
    } else {
      await collection.create((r: any) => {
        r.userId = userId;
        r.merchantKey = input.merchantKey;
        r.merchantLabel = input.merchantLabel;
        r.description = input.description ?? null;
        r.categoryId = input.categoryId ?? null;
        r.type = input.type ?? null;
        r.occurrences = 1;
        r.updatedAt = Date.now();
      });
    }
  });
};

/**
 * Aprende de los movimientos CONFIRMADOS de una importación. Cada comercio
 * con descripción útil se guarda (o actualiza) en el diccionario del usuario.
 * Devuelve cuántos comercios se aprendieron.
 */
export const learnFromConfirmedItems = async (
  userId: string,
  items: {
    description: string;
    type: "income" | "expense" | "transfer";
    categoryId: string | null;
  }[],
): Promise<number> => {
  if (!userId || items.length === 0) return 0;

  let learned = 0;
  for (const item of items) {
    const key = normalizeMerchant(item.description);
    if (!key) continue;
    const label = item.description.trim().slice(0, 60) || key;
    await learnMerchant(userId, {
      merchantKey: key,
      merchantLabel: label,
      description: item.description.trim() || null,
      categoryId: item.type === "transfer" ? null : item.categoryId,
      type: item.type,
    });
    learned += 1;
  }
  return learned;
};

export { learnMerchant };
