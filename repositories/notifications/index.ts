import { database } from "@/database";
import { Notification } from "@/database/models/mlNotification";
import { Q, Query } from "@nozbe/watermelondb";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "userId",
  "eventId",
  "goalId",
  "type",
  "message",
  "sendDate",
  "sendStatus",
  "isRead",
  "expoNotificationId",
] as const;

const REQUIRED_FIELDS = [
  "userId",
  "type",
  "message",
  "sendDate",
  "sendStatus",
  "isRead",
  "expoNotificationId",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type NotificationWritable = Pick<Notification, WritableKey>;
type RequiredNotificationFields = Pick<
  NotificationWritable,
  (typeof REQUIRED_FIELDS)[number]
>;
type OptionalNotificationFields = Partial<
  Omit<NotificationWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type NotificationCreateInput = RequiredNotificationFields &
  OptionalNotificationFields;
export type NotificationUpdateInput = Partial<NotificationWritable>;

export class NotificationRepository {
  // ── READ (radar)
  static buildByUserIdQuery(userId: string): Query<Notification> {
    return database.collections
      .get<Notification>("notifications")
      .query(Q.where("user_id", userId));
  }

  static buildAllQuery(): Query<Notification> {
    return database.collections.get<Notification>("notifications").query();
  }

  static buildByEventIdQuery(eventId: string): Query<Notification> {
    return database.collections
      .get<Notification>("notifications")
      .query(Q.where("event_id", eventId));
  }

  static buildUnreadByUserIdQuery(userId: string): Query<Notification> {
    return database.collections
      .get<Notification>("notifications")
      .query(Q.where("user_id", userId), Q.where("is_read", false));
  }

  static buildRecentByUserIdQuery(
    userId: string,
    limit: number
  ): Query<Notification> {
    return database.collections
      .get<Notification>("notifications")
      .query(
        Q.where("user_id", userId),
        Q.sortBy("send_date", Q.desc),
        Q.take(limit)
      );
  }

  // ── READ puntual
  static async findById(id: string): Promise<Notification> {
    return await database.collections
      .get<Notification>("notifications")
      .find(id);
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: NotificationCreateInput): Notification {
    assertValidKeys(data, WRITABLE_FIELDS, "NotificationRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "NotificationRepository");

    return database.collections
      .get<Notification>("notifications")
      .prepareCreate((notification) => {
        applyCreate(notification, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(
    record: Notification,
    data: NotificationUpdateInput
  ): Notification {
    assertValidKeys(data, WRITABLE_FIELDS, "NotificationRepository");

    return record.prepareUpdate((notification) => {
      applyUpdate(notification, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: Notification): Notification {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: NotificationCreateInput): Promise<Notification> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(
    id: string,
    data: NotificationUpdateInput
  ): Promise<Notification> {
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
