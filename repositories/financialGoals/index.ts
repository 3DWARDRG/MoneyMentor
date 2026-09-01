import { database } from "@/database";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { Q } from "@nozbe/watermelondb";
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
  static async create(data: FinancialGoalCreateInput): Promise<FinancialGoal> {
    assertValidKeys(data, WRITABLE_FIELDS, "FinancialGoalRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "FinancialGoalRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<FinancialGoal>("financial_goals");
      return await collection.create((goal) => {
        applyCreate(goal, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: FinancialGoalUpdateInput
  ): Promise<FinancialGoal> {
    assertValidKeys(data, WRITABLE_FIELDS, "FinancialGoalRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<FinancialGoal>("financial_goals");
      const goal = await collection.find(id);
      return await goal.update((g) => {
        applyUpdate(g, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection =
        database.collections.get<FinancialGoal>("financial_goals");
      const goal = await collection.find(id);
      await goal.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<FinancialGoal> {
    const collection =
      database.collections.get<FinancialGoal>("financial_goals");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<FinancialGoal[]> {
    const collection =
      database.collections.get<FinancialGoal>("financial_goals");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<FinancialGoal[]> {
    const collection =
      database.collections.get<FinancialGoal>("financial_goals");
    return await collection.query().fetch();
  }
}
