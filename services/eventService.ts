import { runBatch } from "@/database/batch";
import { Event, EventRecurrence } from "@/database/models/mlEvent";
import { Model } from "@nozbe/watermelondb";
import { EventRepository } from "@/repositories/events";
import { NotificationRepository } from "@/repositories/notifications";
import {
  cancelScheduledNotification,
  scheduleEventNotification,
} from "@/services/notifications";

export interface CreateEventInput {
  userId: string;
  title: string;
  amount: number;
  targetTimestamp: number;
  category: string;
  recurrence: EventRecurrence;
  expoNotificationId: string | null;
}

/** Crea el evento y (si hay alarma del OS) su notificación, en una transacción. */
export async function createEventWithNotification(
  input: CreateEventInput
): Promise<Event> {
  const event = EventRepository.prepareCreate({
    userId: input.userId,
    title: input.title,
    description: "",
    startDate: input.targetTimestamp,
    endDate: input.targetTimestamp,
    creationDate: Date.now(),
    calendarEventId: null,
    category: input.category,
    amount: input.amount,
    status: "pending",
    recurrence: input.recurrence,
  });

  const prepared: Model[] = [event];

  if (input.expoNotificationId) {
    const notification = NotificationRepository.prepareCreate({
      userId: input.userId,
      eventId: event.id,
      goalId: null,
      type: "EXPENSE_REMINDER",
      message: `Recordatorio de pago: ${input.title}`,
      sendDate: input.targetTimestamp,
      sendStatus: false,
      isRead: false,
      expoNotificationId: input.expoNotificationId,
    });
    prepared.push(notification);
  }

  await runBatch(...prepared);
  return event;
}

export interface UpdateEventInput {
  eventId: string;
  title: string;
  amount: number;
  targetTimestamp: number;
  category: string;
  recurrence: EventRecurrence;
}

/** Actualiza el evento; si cambia fecha/título, reprograma la alarma del OS. */
export async function updateEvent(input: UpdateEventInput): Promise<void> {
  const event = await EventRepository.findById(input.eventId);
  const notifications = await NotificationRepository.buildByEventIdQuery(
    input.eventId
  ).fetch();
  const notification = notifications[0] ?? null;

  let newExpoNotificationId: string | null = null;
  const dateChanged = event.startDate !== input.targetTimestamp;
  const titleChanged = event.title !== input.title;

  if (notification && (dateChanged || titleChanged)) {
    if (notification.expoNotificationId) {
      await cancelScheduledNotification(notification.expoNotificationId);
    }
    newExpoNotificationId = await scheduleEventNotification(
      input.title,
      input.amount,
      input.targetTimestamp,
      input.category
    );
  }

  const preparedEvent = EventRepository.prepareUpdate(event, {
    title: input.title,
    amount: input.amount,
    startDate: input.targetTimestamp,
    endDate: input.targetTimestamp,
    category: input.category,
    recurrence: input.recurrence,
  });

  const prepared: Model[] = [preparedEvent];

  if (notification && newExpoNotificationId) {
    const updatedNotification = NotificationRepository.prepareUpdate(
      notification,
      {
        expoNotificationId: newExpoNotificationId,
        message: `Recordatorio de pago: ${input.title}`,
        sendDate: input.targetTimestamp,
      }
    );
    prepared.push(updatedNotification);
  }

  await runBatch(...prepared);
}

/** Cancela la alarma del OS y borra el evento y su notificación (atómico). */
export async function deleteEvent(eventId: string): Promise<void> {
  const event = await EventRepository.findById(eventId);
  const notifications = await NotificationRepository.buildByEventIdQuery(
    eventId
  ).fetch();
  const notification = notifications[0] ?? null;

  if (notification?.expoNotificationId) {
    await cancelScheduledNotification(notification.expoNotificationId);
  }

  const prepared: Model[] = [EventRepository.prepareDelete(event)];
  if (notification) {
    prepared.push(NotificationRepository.prepareDelete(notification));
  }

  await runBatch(...prepared);
}

export interface UpcomingReminderRow {
  id: string;
  title: string;
  amount: number;
  status: string;
  date: number;
}

export async function getUpcomingReminders(
  userId: string,
  limit = 5
): Promise<UpcomingReminderRow[]> {
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit)));

  const events = await EventRepository.buildUpcomingByUserIdQuery(
    userId,
    Date.now(),
    safeLimit
  ).fetch();

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    amount: event.amount ?? 0,
    status: event.status,
    date: event.startDate,
  }));
}
