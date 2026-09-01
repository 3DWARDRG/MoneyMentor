import { database } from "@/database";
import { Category } from "@/database/models/mlCategory";
import { Q } from "@nozbe/watermelondb";
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
  static async create(data: CategoryCreateInput): Promise<Category> {
    assertValidKeys(data, WRITABLE_FIELDS, "CategoryRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "CategoryRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Category>("categories");
      return await collection.create((category) => {
        applyCreate(category, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: CategoryUpdateInput
  ): Promise<Category> {
    assertValidKeys(data, WRITABLE_FIELDS, "CategoryRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Category>("categories");
      const category = await collection.find(id);
      return await category.update((cat) => {
        applyUpdate(cat, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection = database.collections.get<Category>("categories");
      const category = await collection.find(id);
      await category.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<Category> {
    const collection = database.collections.get<Category>("categories");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<Category[]> {
    const collection = database.collections.get<Category>("categories");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<Category[]> {
    const collection = database.collections.get<Category>("categories");
    return await collection.query().fetch();
  }
}
