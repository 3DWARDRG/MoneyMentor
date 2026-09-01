import { database } from "@/database";
import { Transaction } from "@/database/models/mlTransaction";
import { Q } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "accountId",
  "destinationAccountId",
  "categoryId",
  "goalId",
  "date",
  "amount",
  "description",
  "type",
  "installmentsTotal",
  "installmentsPaid",
  "transferTarget",
  "feeType",
] as const;

const REQUIRED_FIELDS = [
  "userId",
  "date",
  "amount",
  "description",
  "type",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type TransactionWritable = Pick<Transaction, WritableKey>;
type RequiredTransactionFields = Pick<
  TransactionWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalTransactionFields = Partial<
  Omit<TransactionWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type TransactionCreateInput = RequiredTransactionFields &
  OptionalTransactionFields;
export type TransactionUpdateInput = Partial<TransactionWritable>;

export class TransactionRepository {
  static async create(data: TransactionCreateInput): Promise<Transaction> {
    assertValidKeys(data, WRITABLE_FIELDS, "TransactionRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "TransactionRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<Transaction>("transactions");
      return await collection.create((transaction) => {
        applyCreate(transaction, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: TransactionUpdateInput
  ): Promise<Transaction> {
    assertValidKeys(data, WRITABLE_FIELDS, "TransactionRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<Transaction>("transactions");
      const transaction = await collection.find(id);
      return await transaction.update((tx) => {
        applyUpdate(tx, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection =
        database.collections.get<Transaction>("transactions");
      const transaction = await collection.find(id);
      await transaction.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<Transaction> {
    const collection = database.collections.get<Transaction>("transactions");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<Transaction[]> {
    const collection = database.collections.get<Transaction>("transactions");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<Transaction[]> {
    const collection = database.collections.get<Transaction>("transactions");
    return await collection.query().fetch();
  }
}
