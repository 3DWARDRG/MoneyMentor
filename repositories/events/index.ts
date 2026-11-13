import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { Q, Query } from "@nozbe/watermelondb";
import { Observable } from "@nozbe/watermelondb/utils/rx";
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
  // Columnas (snake_case) que pueden cambiar y deben re-emitir en observaciones.
  static readonly OBSERVABLE_COLUMNS: string[] = [
    "title",
    "amount",
    "start_date",
    "end_date",
    "category",
    "status",
    "recurrence",
    "description",
  ];

  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<Event> {
    return database.collections
      .get<Event>("events")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<Event> {
    return database.collections.get<Event>("events").query();
  }

  static buildUpcomingByUserIdQuery(
    userId: string,
    from: number,
    limit: number
  ): Query<Event> {
    return database.collections
      .get<Event>("events")
      .query(
        Q.where("user_id", userId),
        Q.where("start_date", Q.gte(from)),
        Q.sortBy("start_date", Q.asc),
        Q.take(limit)
      );
  }

  static buildPendingByUserIdQuery(userId: string): Query<Event> {
    return database.collections
      .get<Event>("events")
      .query(
        Q.where("user_id", userId),
        Q.where("status", "pending"),
        Q.sortBy("start_date", Q.asc)
      );
  }

  // ── READ puntual
  static async findById(id: string): Promise<Event> {
    return await database.collections.get<Event>("events").find(id);
  }

  // ── READ reactivo de un registro (reacciona a TODOS sus campos)
  static observeById(id: string): Observable<Event> {
    return database.collections.get<Event>("events").findAndObserve(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: EventCreateInput): Event {
    assertValidKeys(data, WRITABLE_FIELDS, "EventRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "EventRepository");

    return database.collections
      .get<Event>("events")
      .prepareCreate((event) => {
        applyCreate(event, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(record: Event, data: EventUpdateInput): Event {
    assertValidKeys(data, WRITABLE_FIELDS, "EventRepository");

    return record.prepareUpdate((event) => {
      applyUpdate(event, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: Event): Event {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: EventCreateInput): Promise<Event> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(id: string, data: EventUpdateInput): Promise<Event> {
    return await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareUpdate(record, data);
      await database.batch(prepared);
      return prepared;
    });
  }

  static async delete(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareDelete(record);
      await database.batch(prepared);
    });
  }
}
