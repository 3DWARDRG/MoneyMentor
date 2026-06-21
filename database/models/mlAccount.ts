import { Model } from "@nozbe/watermelondb";
import { children, field, relation } from "@nozbe/watermelondb/decorators";

export class Account extends Model {
  static table = "accounts";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    transactions: { type: "has_many", foreignKey: "account_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("name") name!: string;
  @field("icon_image") iconImage!: string;

  @field("balance") balance!: number | null;
  @field("type") type!: string | null;
  @field("institution") institution!: string | null;
  @field("currency") currency!: string | null;
  @field("is_active") isActive!: boolean | null;
  @field("credit_limit") creditLimit!: number | null;
  @field("interest_rate") interestRate!: number | null;
  @field("payment_due_day") paymentDueDay!: number | null;
  @field("closing_day") closingDay!: number | null;

  @relation("users", "user_id") user: any;
  @children("transactions") transactions!: any;
}