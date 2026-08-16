import { DEFAULT_CATEGORIES } from "@/constants/defaultCategories";
import { database } from "@/database";
import { Q } from "@nozbe/watermelondb";

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

export async function ensureDefaultCategoriesForUser(userId: string) {
  try {
    const catsCollection = database.get("categories");

    const existing = await catsCollection
      .query(Q.where("user_id", userId))
      .fetch();

    const existingNames = new Set(
      existing.map((c: any) => `${c.name}__${c.type}`),
    );

    const toCreate = DEFAULT_CATEGORIES.filter(
      (cat) => !existingNames.has(`${cat.name}__${cat.type}`),
    );

    // Migración de iconos: si una categoría existente tiene un emoji viejo,
    // la actualizamos al token premium equivalente.
    let migrated = 0;
    await database.write(async () => {
      for (const record of existing) {
        const premiumKey = LEGACY_EMOJI_TO_PREMIUM[(record as any).iconImage];
        if (premiumKey) {
          await record.update((r: any) => {
            r.iconImage = premiumKey;
          });
          migrated++;
        }
      }

      for (const cat of toCreate) {
        await catsCollection.create((record: any) => {
          record.userId = userId;
          record.name = cat.name;
          record.iconImage = cat.iconImage;
          record.type = cat.type;
        });
      }
    });

    if (migrated > 0) {
      console.log(
        `✅ Migrados ${migrated} iconos de categorías a premium para:`,
        userId,
      );
    }

    const inserted = await catsCollection
      .query(Q.where("user_id", userId))
      .fetch();

    console.log(
      `✅ Creadas ${toCreate.length} categorías para usuario:`,
      userId,
    );
    console.log("📦 Categorías verificadas:", inserted.length);
  } catch (error) {
    console.error("❌ Error en ensureDefaultCategoriesForUser:", error);
  }
}

// Exportamos el mapa por si se quiere reutilizar
export { LEGACY_EMOJI_TO_PREMIUM };
