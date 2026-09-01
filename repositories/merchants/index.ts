import { database } from "@/database";
import { MerchantLearning } from "@/database/models/mlMerchantLearning";
import { Q } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "merchantKey",
  "merchantLabel",
  "description",
  "categoryId",
  "type",
  "occurrences",
  "updatedAt",
] as const;

const REQUIRED_FIELDS = [
  "userId",
  "merchantKey",
  "merchantLabel",
  "occurrences",
  "updatedAt",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type MerchantLearningWritable = Pick<MerchantLearning, WritableKey>;
type RequiredMerchantLearningFields = Pick<
  MerchantLearningWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalMerchantLearningFields = Partial<
  Omit<MerchantLearningWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type MerchantLearningCreateInput = RequiredMerchantLearningFields &
  OptionalMerchantLearningFields;
export type MerchantLearningUpdateInput = Partial<MerchantLearningWritable>;

export class MerchantLearningRepository {
  static async create(
    data: MerchantLearningCreateInput
  ): Promise<MerchantLearning> {
    assertValidKeys(data, WRITABLE_FIELDS, "MerchantLearningRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "MerchantLearningRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<MerchantLearning>("merchant_learnings");
      return await collection.create((merchant) => {
        applyCreate(merchant, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: MerchantLearningUpdateInput
  ): Promise<MerchantLearning> {
    assertValidKeys(data, WRITABLE_FIELDS, "MerchantLearningRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<MerchantLearning>("merchant_learnings");
      const merchant = await collection.find(id);
      return await merchant.update((m) => {
        applyUpdate(m, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection =
        database.collections.get<MerchantLearning>("merchant_learnings");
      const merchant = await collection.find(id);
      await merchant.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<MerchantLearning> {
    const collection =
      database.collections.get<MerchantLearning>("merchant_learnings");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<MerchantLearning[]> {
    const collection =
      database.collections.get<MerchantLearning>("merchant_learnings");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<MerchantLearning[]> {
    const collection =
      database.collections.get<MerchantLearning>("merchant_learnings");
    return await collection.query().fetch();
  }
}
