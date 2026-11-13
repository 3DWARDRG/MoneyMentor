import { database } from "@/database";
import { MerchantLearning } from "@/database/models/mlMerchantLearning";
import { Q, Query } from "@nozbe/watermelondb";
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
  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<MerchantLearning> {
    return database.collections
      .get<MerchantLearning>("merchant_learnings")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<MerchantLearning> {
    return database.collections
      .get<MerchantLearning>("merchant_learnings")
      .query();
  }

  static buildByUserAndKeyQuery(
    userId: string,
    merchantKey: string
  ): Query<MerchantLearning> {
    return database.collections
      .get<MerchantLearning>("merchant_learnings")
      .query(Q.where("user_id", userId), Q.where("merchant_key", merchantKey));
  }

  static buildByUserAndKeysQuery(
    userId: string,
    keys: string[]
  ): Query<MerchantLearning> {
    return database.collections
      .get<MerchantLearning>("merchant_learnings")
      .query(Q.where("user_id", userId), Q.where("merchant_key", Q.oneOf(keys)));
  }

  // ── READ puntual
  static async findById(id: string): Promise<MerchantLearning> {
    return await database.collections
      .get<MerchantLearning>("merchant_learnings")
      .find(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(
    data: MerchantLearningCreateInput
  ): MerchantLearning {
    assertValidKeys(data, WRITABLE_FIELDS, "MerchantLearningRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "MerchantLearningRepository");

    return database.collections
      .get<MerchantLearning>("merchant_learnings")
      .prepareCreate((merchant) => {
        applyCreate(merchant, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(
    record: MerchantLearning,
    data: MerchantLearningUpdateInput
  ): MerchantLearning {
    assertValidKeys(data, WRITABLE_FIELDS, "MerchantLearningRepository");

    return record.prepareUpdate((merchant) => {
      applyUpdate(merchant, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: MerchantLearning): MerchantLearning {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: MerchantLearningCreateInput): Promise<MerchantLearning> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: MerchantLearningUpdateInput
  ): Promise<MerchantLearning> {
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
