import { DEFAULT_CATEGORIES } from "@/constants/defaultCategories";
import { database } from "@/database";
import { Q } from "@nozbe/watermelondb";

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

    if (toCreate.length === 0) {
      console.log("✅ Categorías ya existentes para usuario:", userId);
      return;
    }

    await database.write(async () => {
      for (const cat of toCreate) {
        await catsCollection.create((record: any) => {
          record.user_id = userId;
          record.name = cat.name;
          record.iconImage = cat.iconImage;
          record.type = cat.type;
        });
      }
    });

    console.log(
      `✅ Creadas ${toCreate.length} categorías para usuario:`,
      userId,
    );
  } catch (error) {
    console.error("❌ Error en ensureDefaultCategoriesForUser:", error);
  }
}
