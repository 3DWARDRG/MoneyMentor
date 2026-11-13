import { database } from "@/database";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { Q, Query } from "@nozbe/watermelondb";
import { Observable } from "@nozbe/watermelondb/utils/rx";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "title",
  "description",
  "amount",
  "deadline",
  "creationDate",
  "progress",
  "savedAmount",
] as const;

const REQUIRED_FIELDS = [
  "userId",
  "title",
  "description",
  "amount",
  "deadline",
  "creationDate",
  "savedAmount",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type FinancialGoalWritable = Pick<FinancialGoal, WritableKey>;
type RequiredFinancialGoalFields = Pick<
  FinancialGoalWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalFinancialGoalFields = Partial<
  Omit<FinancialGoalWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type FinancialGoalCreateInput = RequiredFinancialGoalFields &
  OptionalFinancialGoalFields;
export type FinancialGoalUpdateInput = Partial<FinancialGoalWritable>;

export class FinancialGoalRepository {
  // Columnas (snake_case) que pueden cambiar y deben re-emitir en observaciones.
  static readonly OBSERVABLE_COLUMNS: string[] = [
    "title",
    "amount",
    "saved_amount",
    "progress",
    "deadline",
    "description",
  ];

  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<FinancialGoal> {
    return database.collections
      .get<FinancialGoal>("financial_goals")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<FinancialGoal> {
    return database.collections.get<FinancialGoal>("financial_goals").query();
  }

  // ── READ puntual
  static async findById(id: string): Promise<FinancialGoal> {
    return await database.collections
      .get<FinancialGoal>("financial_goals")
      .find(id);
  }

  // ── READ reactivo de un registro (reacciona a TODOS sus campos)
  static observeById(id: string): Observable<FinancialGoal> {
    return database.collections
      .get<FinancialGoal>("financial_goals")
      .findAndObserve(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: FinancialGoalCreateInput): FinancialGoal {
    assertValidKeys(data, WRITABLE_FIELDS, "FinancialGoalRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "FinancialGoalRepository");

    return database.collections
      .get<FinancialGoal>("financial_goals")
      .prepareCreate((goal) => {
        applyCreate(goal, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(
    record: FinancialGoal,
    data: FinancialGoalUpdateInput
  ): FinancialGoal {
    assertValidKeys(data, WRITABLE_FIELDS, "FinancialGoalRepository");

    return record.prepareUpdate((goal) => {
      applyUpdate(goal, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: FinancialGoal): FinancialGoal {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: FinancialGoalCreateInput): Promise<FinancialGoal> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: FinancialGoalUpdateInput
  ): Promise<FinancialGoal> {
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
