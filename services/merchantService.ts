import { runBatch } from "@/database/batch";
import { MerchantLearning } from "@/database/models/mlMerchantLearning";
import { MerchantLearningRepository } from "@/repositories/merchants";
import { normalizeMerchant } from "@/utils/merchantNormalizer";

// ---------------------------------------------------------------------------
// Diccionario persistente
// ---------------------------------------------------------------------------

export interface MerchantLearningRow {
  merchantKey: string;
  merchantLabel: string;
  description: string | null;
  categoryId: string | null;
  type: "income" | "expense" | "transfer" | null;
  occurrences: number;
}

const toRow = (record: MerchantLearning): MerchantLearningRow => ({
  merchantKey: record.merchantKey,
  merchantLabel: record.merchantLabel,
  description: record.description ?? null,
  categoryId: record.categoryId ?? null,
  type: (record.type as MerchantLearningRow["type"]) ?? null,
  occurrences: record.occurrences ?? 0,
});

export async function getMerchantLearning(
  userId: string,
  merchantKey: string
): Promise<MerchantLearningRow | null> {
  if (!userId || !merchantKey) return null;

  const rows = await MerchantLearningRepository.buildByUserAndKeyQuery(
    userId,
    merchantKey
  ).fetch();

  return rows.length > 0 ? toRow(rows[0]) : null;
}

export async function getMerchantLearningsByKeys(
  userId: string,
  keys: (string | null)[]
): Promise<Record<string, MerchantLearningRow>> {
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  if (!userId || unique.length === 0) return {};

  const rows = await MerchantLearningRepository.buildByUserAndKeysQuery(
    userId,
    unique
  ).fetch();

  const map: Record<string, MerchantLearningRow> = {};
  for (const row of rows) map[row.merchantKey] = toRow(row);
  return map;
}

export interface LearnMerchantInput {
  merchantKey: string;
  merchantLabel: string;
  description: string | null;
  categoryId: string | null;
  type: "income" | "expense" | "transfer" | null;
}

/** Aprende (o actualiza) un único comercio. */
export async function learnMerchant(
  userId: string,
  input: LearnMerchantInput
): Promise<void> {
  const existing = await MerchantLearningRepository.buildByUserAndKeyQuery(
    userId,
    input.merchantKey
  ).fetch();

  if (existing.length > 0) {
    const record = existing[0];
    await MerchantLearningRepository.update(record.id, {
      merchantLabel: input.merchantLabel,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      type: input.type ?? null,
      occurrences: (record.occurrences ?? 0) + 1,
      updatedAt: Date.now(),
    });
  } else {
    await MerchantLearningRepository.create({
      userId,
      merchantKey: input.merchantKey,
      merchantLabel: input.merchantLabel,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      type: input.type ?? null,
      occurrences: 1,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Aprende de los movimientos CONFIRMADOS de una importación. Agrupa por
 * comercio (varios movimientos del mismo comercio suman ocurrencias) y
 * escribe todo en UNA sola transacción. Devuelve cuántos comercios se aprendieron.
 */
export async function learnFromConfirmedItems(
  userId: string,
  items: {
    description: string;
    type: "income" | "expense" | "transfer";
    categoryId: string | null;
  }[]
): Promise<number> {
  if (!userId || items.length === 0) return 0;

  const grouped = new Map<
    string,
    {
      count: number;
      merchantLabel: string;
      description: string | null;
      categoryId: string | null;
      type: "income" | "expense" | "transfer";
    }
  >();

  for (const item of items) {
    const key = normalizeMerchant(item.description);
    if (!key) continue;

    const description = item.description.trim() || null;
    const categoryId = item.type === "transfer" ? null : item.categoryId;
    const merchantLabel = item.description.trim().slice(0, 60) || key;

    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.merchantLabel = merchantLabel;
      existing.description = description;
      existing.categoryId = categoryId;
      existing.type = item.type;
    } else {
      grouped.set(key, {
        count: 1,
        merchantLabel,
        description,
        categoryId,
        type: item.type,
      });
    }
  }

  if (grouped.size === 0) return 0;

  const records = await MerchantLearningRepository.buildByUserAndKeysQuery(
    userId,
    [...grouped.keys()]
  ).fetch();
  const byKey = new Map(records.map((record) => [record.merchantKey, record]));

  const now = Date.now();
  const prepared: MerchantLearning[] = [];

  for (const [merchantKey, group] of grouped) {
    const record = byKey.get(merchantKey);

    if (record) {
      prepared.push(
        MerchantLearningRepository.prepareUpdate(record, {
          merchantLabel: group.merchantLabel,
          description: group.description,
          categoryId: group.categoryId,
          type: group.type,
          occurrences: (record.occurrences ?? 0) + group.count,
          updatedAt: now,
        })
      );
    } else {
      prepared.push(
        MerchantLearningRepository.prepareCreate({
          userId,
          merchantKey,
          merchantLabel: group.merchantLabel,
          description: group.description,
          categoryId: group.categoryId,
          type: group.type,
          occurrences: group.count,
          updatedAt: now,
        })
      );
    }
  }

  await runBatch(...prepared);
  return grouped.size;
}
