import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { Q } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "title",
  "description",
  "startDate",
  "endDate",
  "creationDate",
  "calendarEventId",
  "category",
  "amount",
  "status",
  "recurrence",
] as const;

const REQUIRED_FIELDS = [
  "userId",
  "title",
  "description",
  "startDate",
  "endDate",
  "creationDate",
  "category",
  "amount",
  "status",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type EventWritable = Pick<Event, WritableKey>;
type RequiredEventFields = Pick<
  EventWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalEventFields = Partial<
  Omit<EventWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type EventCreateInput = RequiredEventFields & OptionalEventFields;
export type EventUpdateInput = Partial<EventWritable>;

export class EventRepository {
  static async create(data: EventCreateInput): Promise<Event> {
    assertValidKeys(data, WRITABLE_FIELDS, "EventRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "EventRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Event>("events");
      return await collection.create((event) => {
        applyCreate(event, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(id: string, data: EventUpdateInput): Promise<Event> {
    assertValidKeys(data, WRITABLE_FIELDS, "EventRepository");

    return await database.write(async () => {
      const collection = database.collections.get<Event>("events");
      const event = await collection.find(id);
      return await event.update((evt) => {
        applyUpdate(evt, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection = database.collections.get<Event>("events");
      const event = await collection.find(id);
      await event.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<Event> {
    const collection = database.collections.get<Event>("events");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<Event[]> {
    const collection = database.collections.get<Event>("events");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<Event[]> {
    const collection = database.collections.get<Event>("events");
    return await collection.query().fetch();
  }
}
