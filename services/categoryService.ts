import { DEFAULT_CATEGORIES } from "@/constants/defaultCategories";
import { runBatch } from "@/database/batch";
import { Category } from "@/database/models/mlCategory";
import { CategoryRepository } from "@/repositories/categories";

// Mapa de emojis antiguos -> token premium (migración 1 vez)
const LEGACY_EMOJI_TO_PREMIUM: Record<string, string> = {
  "🍔": "food",
  "🚗": "transport",
  "🎬": "entertainment",
  "🏥": "health",
  "📚": "education",
  "💡": "utilities",
  "👕": "clothing",
  "🛒": "supermarket",
  "☕": "coffee",
  "💪": "gym",
  "💰": "salary",
  "💻": "freelance",
  "🎁": "gift",
  "📈": "investment",
  "🔄": "refund",
  "🏷️": "sale",
  "💵": "other_income",
};

export interface CategoryMapEntry {
  name: string;
  icon: string;
}

/** Lista de categorías del usuario (lectura one-shot para código no-React). */
export async function getCategories(userId: string): Promise<Category[]> {
  return await CategoryRepository.buildByUserIdQuery(userId).fetch();
}

/** Mapa id de categoría -> { name, icon } para el usuario. */
export async function getCategoriesMap(
  userId: string
): Promise<Record<string, CategoryMapEntry>> {
  const categories = await CategoryRepository.buildByUserIdQuery(userId).fetch();
  const map: Record<string, CategoryMapEntry> = {};
  for (const category of categories) {
    map[category.id] = {
      name: category.name,
      icon: category.iconImage || "📁",
    };
  }
  return map;
}

/**
 * Asegura que el usuario tenga las categorías por defecto y migra los iconos
 * legacy (emoji) a los tokens premium. Todo en una sola transacción.
 */
export async function ensureDefaultCategoriesForUser(
  userId: string
): Promise<void> {
  try {
    const existing = await CategoryRepository.buildByUserIdQuery(userId).fetch();

    const existingNames = new Set(existing.map((c) => `${c.name}__${c.type}`));
    const toCreate = DEFAULT_CATEGORIES.filter(
      (cat) => !existingNames.has(`${cat.name}__${cat.type}`)
    );

    const prepared: Category[] = [];
    let migrated = 0;

    for (const record of existing) {
      const premiumKey = LEGACY_EMOJI_TO_PREMIUM[record.iconImage];
      if (premiumKey) {
        prepared.push(
          CategoryRepository.prepareUpdate(record, { iconImage: premiumKey })
        );
        migrated++;
      }
    }

    for (const cat of toCreate) {
      prepared.push(
        CategoryRepository.prepareCreate({
          userId,
          name: cat.name,
          iconImage: cat.iconImage,
          type: cat.type,
        })
      );
    }

    if (prepared.length > 0) {
      await runBatch(...prepared);
    }

    if (migrated > 0) {
      console.log(
        `✅ Migrados ${migrated} iconos de categorías a premium para:`,
        userId
      );
    }
    console.log(`✅ Creadas ${toCreate.length} categorías para usuario:`, userId);
  } catch (error) {
    console.error("❌ Error en ensureDefaultCategoriesForUser:", error);
  }
}

/** Devuelve el id de la categoría "Ahorro", creándola si no existe. */
export async function ensureAhorroCategory(userId: string): Promise<string> {
  const existing = await CategoryRepository.buildByUserIdQuery(userId).fetch();
  const ahorro = existing.find(
    (c) => c.name === "Ahorro" && c.type === "expense"
  );
  if (ahorro) return ahorro.id;

  const created = await CategoryRepository.create({
    userId,
    name: "Ahorro",
    iconImage: "goal",
    type: "expense",
  });
  console.log("✅ Categoría Ahorro creada:", created.id);
  return created.id;
}
