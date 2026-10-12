import { database } from "@/database";
import { Transaction } from "@/database/models/mlTransaction";
import { Q, Query } from "@nozbe/watermelondb";
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
  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<Transaction> {
    return database.collections
      .get<Transaction>("transactions")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<Transaction> {
    return database.collections.get<Transaction>("transactions").query();
  }

  static buildByUserAndDateRangeQuery(
    userId: string,
    start: number,
    end: number
  ): Query<Transaction> {
    return database.collections
      .get<Transaction>("transactions")
      .query(Q.where("user_id", userId), Q.where("date", Q.between(start, end)));
  }

  static buildRecentByUserIdQuery(
    userId: string,
    limit: number
  ): Query<Transaction> {
    return database.collections
      .get<Transaction>("transactions")
      .query(
        Q.where("user_id", userId),
        Q.sortBy("date", Q.desc),
        Q.take(limit)
      );
  }

  // ── READ puntual
  static async findById(id: string): Promise<Transaction> {
    return await database.collections.get<Transaction>("transactions").find(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: TransactionCreateInput): Transaction {
    assertValidKeys(data, WRITABLE_FIELDS, "TransactionRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "TransactionRepository");

    return database.collections
      .get<Transaction>("transactions")
      .prepareCreate((transaction) => {
        applyCreate(transaction, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(
    record: Transaction,
    data: TransactionUpdateInput
  ): Transaction {
    assertValidKeys(data, WRITABLE_FIELDS, "TransactionRepository");

    return record.prepareUpdate((transaction) => {
      applyUpdate(transaction, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: Transaction): Transaction {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: TransactionCreateInput): Promise<Transaction> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: TransactionUpdateInput
  ): Promise<Transaction> {
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
