import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Q, Query } from "@nozbe/watermelondb";
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
  // Columnas (snake_case) que pueden cambiar y deben re-emitir en observaciones.
  static readonly OBSERVABLE_COLUMNS: string[] = [
    "name",
    "balance",
    "type",
    "credit_subtype",
    "currency",
    "is_active",
    "icon_image",
    "institution",
    "credit_limit",
    "interest_rate",
    "payment_due_day",
    "statement_closing_day",
    "apr_annual",
    "apr_monthly",
    "card_last4",
    "maintenance_fee_amount",
    "maintenance_fee_frequency",
  ];

  // ── READ (radar): devuelven Query; el consumidor decide .observe()/.fetch()
  static buildByUserIdQuery(userId: string): Query<Account> {
    return database.collections
      .get<Account>("accounts")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<Account> {
    return database.collections.get<Account>("accounts").query();
  }

  // ── READ puntual: leer un registro para luego preparar una escritura
  static async findById(id: string): Promise<Account> {
    return await database.collections.get<Account>("accounts").find(id);
  }

  // ── WRITE (empaquetador): síncronos, devuelven el record preparado
  static prepareCreate(data: AccountCreateInput): Account {
    assertValidKeys(data, WRITABLE_FIELDS, "AccountRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "AccountRepository");

    return database.collections
      .get<Account>("accounts")
      .prepareCreate((account) => {
        applyCreate(account, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(record: Account, data: AccountUpdateInput): Account {
    assertValidKeys(data, WRITABLE_FIELDS, "AccountRepository");

    return record.prepareUpdate((account) => {
      applyUpdate(account, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: Account): Account {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia: envuelven prepare dentro de database.write
  static create(data: AccountCreateInput): Promise<Account> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: AccountUpdateInput
  ): Promise<Account> {
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
