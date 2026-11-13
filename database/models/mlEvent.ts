import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";
export type EventStatus = "pending" | "paid" | "overdue" | "cancelled" ;
export type EventRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export class Event extends Model {
  static table = "events";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("title") title!: string;
  @field("description") description!: string;
  @field("start_date") startDate!: number;
  @field("end_date") endDate!: number;
  @field("creation_date") creationDate!: number;
  @field("calendar_event_id") calendarEventId!: string | null;
  @field("category") category!: string;
  @field("amount") amount!: number;
  @field("status") status!: EventStatus; 
  @field("recurrence") recurrence!: EventRecurrence | null;

  @relation("users", "user_id") user: any;
}
