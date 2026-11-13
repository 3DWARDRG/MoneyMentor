import { database } from "@/database";
import { Category } from "@/database/models/mlCategory";
import { Q, Query } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = ["userId", "name", "iconImage", "type"] as const;
const REQUIRED_FIELDS = ["userId", "name", "iconImage", "type"] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type CategoryWritable = Pick<Category, WritableKey>;
type RequiredCategoryFields = Pick<
  CategoryWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalCategoryFields = Partial<
  Omit<CategoryWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type CategoryCreateInput = RequiredCategoryFields &
  OptionalCategoryFields;
export type CategoryUpdateInput = Partial<CategoryWritable>;

export class CategoryRepository {
  // Columnas (snake_case) que pueden cambiar y deben re-emitir en observaciones.
  static readonly OBSERVABLE_COLUMNS: string[] = [
    "name",
    "icon_image",
    "type",
  ];

  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<Category> {
    return database.collections
      .get<Category>("categories")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<Category> {
    return database.collections.get<Category>("categories").query();
  }

  // ── READ puntual
  static async findById(id: string): Promise<Category> {
    return await database.collections.get<Category>("categories").find(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: CategoryCreateInput): Category {
    assertValidKeys(data, WRITABLE_FIELDS, "CategoryRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "CategoryRepository");

    return database.collections
      .get<Category>("categories")
      .prepareCreate((category) => {
        applyCreate(category, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(record: Category, data: CategoryUpdateInput): Category {
    assertValidKeys(data, WRITABLE_FIELDS, "CategoryRepository");

    return record.prepareUpdate((category) => {
      applyUpdate(category, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: Category): Category {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: CategoryCreateInput): Promise<Category> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: CategoryUpdateInput
  ): Promise<Category> {
    return await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareUpdate(record, data);
      await database.batch(prepared);
      return prepared;
    });
  }

  static async delete(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareDelete(record);
      await database.batch(prepared);
    });
  }
}
