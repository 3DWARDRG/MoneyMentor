import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

export class Notification extends Model {
  static table = "notifications";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
    Event: { type: "belongs_to", key: "event_id" },
    financial_goals: { type: "belongs_to", key: "goal_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("event_id") eventId!: string | null;
  @field("goal_id") goalId!: string | null;
  @field("type") type!: string;
  @field("message") message!: string;
  @field("send_date") sendDate!: number;
  @field("send_status") sendStatus!: boolean;
  @field("is_read") isRead!: boolean;
  @field("expo_notification_id") expoNotificationId!: string;

  @relation("users", "user_id") user: any;
  @relation("event", "event_id") event: any;
  @relation("financial_goals", "goal_id") goal: any;
}
