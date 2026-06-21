import { Model } from "@nozbe/watermelondb";
import { children, field } from "@nozbe/watermelondb/decorators";

export class User extends Model {
  static table = "users";

  static associations = {
    notifications: { type: "has_many", foreignKey: "user_id" },
    events: { type: "has_many", foreignKey: "user_id" },
    accounts: { type: "has_many", foreignKey: "user_id" },
    financial_goals: { type: "has_many", foreignKey: "user_id" },
    categories: { type: "has_many", foreignKey: "user_id" },
    transactions: { type: "has_many", foreignKey: "user_id" },
  } as const;

  @field("names") names!: string;
  @field("last_name") lastName!: string;
  @field("email") email!: string;
  @field("confirm_email") confirmEmail!: boolean | null;
  @field("password") password!: string;
  @field("creation_date") creationDate!: number;
  @field("last_access") lastAccess!: number;

  @children("notifications") notifications!: any;
  @children("events") events!: any;
  @children("accounts") accounts!: any;
  @children("financial_goals") financialGoals!: any;
  @children("categories") categories!: any;
  @children("transactions") transactions!: any;
}
