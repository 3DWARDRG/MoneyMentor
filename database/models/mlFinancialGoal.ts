import { Model } from "@nozbe/watermelondb";
import {
  children,
  field,
  relation,
} from "@nozbe/watermelondb/decorators";

export class FinancialGoal extends Model {
  static table = "financial_goals";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    transactions: { type: "has_many", foreignKey: "goal_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("title") title!: string;
  @field("description") description!: string;
  @field("amount") amount!: number;
  @field("deadline") deadline!: number;
  @field("creation_date") creationDate!: number;
  @field("progress") progress!: number | null;
  @field("saved_amount") savedAmount!: number;

  @relation("users", "user_id") user: any;
  @children("transactions") transactions!: any;
}
