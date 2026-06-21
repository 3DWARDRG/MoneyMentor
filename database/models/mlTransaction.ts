import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

export class Transaction extends Model {
  static table = "transactions";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    categories: { type: "belongs_to", key: "category_id" },
    accounts: { type: "belongs_to", key: "account_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("account_id") accountId!: string | null;
  @field("category_id") categoryId!: string;
  @field("date") date!: number;
  @field("amount") amount!: number;
  @field("description") description!: string;
  @field("type") type!: string;

  @relation("users", "user_id") user: any;
  @relation("categories", "category_id") category: any;
  @relation("accounts", "account_id") account: any;
}
