import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

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
  @field("google_event_id") googleEventId!: string;
  @field("category") category!: string;
  @field("notification") notification!: boolean;

  @relation("users", "user_id") user: any;
}
