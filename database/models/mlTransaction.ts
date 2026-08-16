import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

export class Transaction extends Model {
  static table = "transactions";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    categories: { type: "belongs_to", key: "category_id" },
    accounts: { type: "belongs_to", key: "account_id" },
    financial_goals: { type: "belongs_to", key: "goal_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("account_id") accountId!: string | null;
  @field("destination_account_id") destinationAccountId!: string | null;
  @field("category_id") categoryId!: string | null;
  @field("goal_id") goalId!: string | null;
  @field("date") date!: number;
  @field("amount") amount!: number;
  @field("description") description!: string;
  @field("type") type!: "income" | "expense" | "transfer";

  @field("installments_total") installmentsTotal!: number | null;
  @field("installments_paid") installmentsPaid!: number | null;
  @field("transfer_target") transferTarget!: "own" | "person" | "bank" | null;
  @field("fee_type")
  feeType!:
    | "maintenance"
    | "annual_fee"
    | "late_fee"
    | "cash_advance_fee"
    | "atm_fee"
    | "other_fee"
    | null;

  @relation("users", "user_id") user: any;
  @relation("categories", "category_id") category: any;
  @relation("accounts", "account_id") account: any;
  @relation("financial_goals", "goal_id") goal: any;
}
