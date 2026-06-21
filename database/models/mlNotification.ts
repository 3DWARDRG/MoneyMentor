import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

export class Notification extends Model {
  static table = "notifications";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("type") type!: string;
  @field("message") message!: string;
  @field("send_date") sendDate!: number;
  @field("send_status") sendStatus!: boolean;

  @relation("users", "user_id") user: any;
}
