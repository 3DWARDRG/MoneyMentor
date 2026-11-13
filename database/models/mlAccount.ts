import { Model } from "@nozbe/watermelondb";
import {
  children,
  field,
  relation,
  text,
} from "@nozbe/watermelondb/decorators";

export class Account extends Model {
  static table = "accounts";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    transactions: { type: "has_many", foreignKey: "account_id" },
  } as const;

  @field("user_id") userId!: string;

  @text("name") name!: string;
  @text("icon_image") iconImage!: string;

  @field("balance") balance!: number | null;
  @text("type") type!: string | null;
  @text("institution") institution!: string | null;
  @text("currency") currency!: string | null;
  @field("is_active") isActive!: boolean | null;

  @field("credit_limit") creditLimit!: number | null;
  @field("interest_rate") interestRate!: number | null;
  @field("payment_due_day") paymentDueDay!: number | null;
  @field("statement_closing_day") statementClosingDay!: number | null;
  @field("apr_annual") aprAnnual!: number | null;
  @field("apr_monthly") aprMonthly!: number | null;

  @text("card_last4") cardLast4!: string | null;
  @text("credit_subtype") creditSubtype!: string | null;

  @field("maintenance_fee_amount") maintenanceFeeAmount!: number | null;
  @text("maintenance_fee_frequency")
  maintenanceFeeFrequency!: "monthly" | "annual" | "quarterly" | null;

  @relation("users", "user_id") user: any;
  @children("transactions") transactions!: any;
}
