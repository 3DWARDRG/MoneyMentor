import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Q } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "name",
  "iconImage",
  "balance",
  "type",
  "institution",
  "currency",
  "isActive",
  "creditLimit",
  "interestRate",
  "paymentDueDay",
  "statementClosingDay",
  "aprAnnual",
  "aprMonthly",
  "cardLast4",
  "creditSubtype",
  "maintenanceFeeAmount",
  "maintenanceFeeFrequency",
] as const;

const REQUIRED_FIELDS = ["userId", "name", "iconImage"] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type AccountWritable = Pick<Account, WritableKey>;
type RequiredAccountFields = Pick<
  AccountWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalAccountFields = Partial<
  Omit<AccountWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type AccountCreateInput = RequiredAccountFields & OptionalAccountFields;
export type AccountUpdateInput = Partial<AccountWritable>;

export class AccountRepository {
  static async create(data: AccountCreateInput): Promise<Account> {
    assertValidKeys(data, WRITABLE_FIELDS, "AccountRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "AccountRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Account>("accounts");
      return await collection.create((account) => {
        applyCreate(account, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: AccountUpdateInput
  ): Promise<Account> {
    assertValidKeys(data, WRITABLE_FIELDS, "AccountRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Account>("accounts");
      const account = await collection.find(id);
      return await account.update((acc) => {
        applyUpdate(acc, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection = database.collections.get<Account>("accounts");
      const account = await collection.find(id);
      await account.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<Account> {
    const collection = database.collections.get<Account>("accounts");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<Account[]> {
    const collection = database.collections.get<Account>("accounts");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<Account[]> {
    const collection = database.collections.get<Account>("accounts");
    return await collection.query().fetch();
  }
}
