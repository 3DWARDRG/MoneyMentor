import { database } from "@/database";
import { Notification } from "@/database/models/mlNotification";
import { Q } from "@nozbe/watermelondb";
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
  static async create(data: NotificationCreateInput): Promise<Notification> {
    assertValidKeys(data, WRITABLE_FIELDS, "NotificationRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "NotificationRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<Notification>("notifications");
      return await collection.create((notification) => {
        applyCreate(notification, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(
    id: string,
    data: NotificationUpdateInput
  ): Promise<Notification> {
    assertValidKeys(data, WRITABLE_FIELDS, "NotificationRepository");

    return await database.write(async () => {
      const collection =
        database.collections.get<Notification>("notifications");
      const notification = await collection.find(id);
      return await notification.update((n) => {
        applyUpdate(n, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection =
        database.collections.get<Notification>("notifications");
      const notification = await collection.find(id);
      await notification.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<Notification> {
    const collection =
      database.collections.get<Notification>("notifications");
    return await collection.find(id);
  }

  static async findAllByUserId(userId: string): Promise<Notification[]> {
    const collection =
      database.collections.get<Notification>("notifications");
    return await collection.query(Q.where("user_id", userId)).fetch();
  }

  static async findAll(): Promise<Notification[]> {
    const collection =
      database.collections.get<Notification>("notifications");
    return await collection.query().fetch();
  }
}
