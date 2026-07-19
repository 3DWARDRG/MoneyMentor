// /helpers/eventsHelper.ts (o donde tengas tus helpers)
import { database } from "@/database"; // Ruta a tu instancia de WatermelonDB
import { Event, EventRecurrence } from "@/database/models/mlEvent";
import { Notification } from "@/database/models/mlNotification";
import {
  cancelScheduledNotification,
  scheduleEventNotification,
} from "@/services/notifications";
import { Q } from "@nozbe/watermelondb";

interface CreateEventParams {
  userId: string;
  title: string;
  amount: number;
  targetTimestamp: number;
  category: string;
  recurrence: EventRecurrence;
  // Datos para la vinculación
  expoNotificationId: string | null;
}

export const createExpenseEventWithNotification = async (
  params: CreateEventParams,
) => {
  return await database.write(async () => {
    const eventsCollection = database.get<Event>("events");
    const notificationsCollection = database.get<Notification>("notifications");

    const batchOperations = [];

    // 1. Instanciamos el Evento (completando los campos de tu modelo real)
    const newEvent = eventsCollection.prepareCreate((event) => {
      event.userId = params.userId;
      event.title = params.title;
      event.description = ""; // Puedes agregarlo después a la UI si quieres
      event.startDate = params.targetTimestamp;
      event.endDate = params.targetTimestamp; // Por ahora igual al inicio
      event.creationDate = Date.now();
      event.calendarEventId = null;
      event.category = params.category;
      event.amount = params.amount;
      event.status = "pending"; // En minúscula según tu Type EventStatus
      event.recurrence = params.recurrence;
    });

    batchOperations.push(newEvent);

    // 2. Instanciamos la Notificación (si Expo devolvió un ID)
    if (params.expoNotificationId) {
      const newNotification = notificationsCollection.prepareCreate((notif) => {
        notif.userId = params.userId;
        notif.eventId = newEvent.id;
        notif.goalId = null;
        notif.type = "EXPENSE_REMINDER"; // Campo obligatorio de tu modelo
        notif.message = `Recordatorio de pago: ${params.title}`;
        notif.sendDate = params.targetTimestamp;
        notif.sendStatus = false;
        notif.isRead = false;
        notif.expoNotificationId = params.expoNotificationId ?? "";
      });

      batchOperations.push(newNotification);
    }

    // 3. Ejecutamos el batch
    await database.batch(...batchOperations);

    // Retornamos el evento por si la UI lo necesita para algo (ej. redirección)
    return newEvent;
  });
};

// ==========================================
// ELIMINAR EVENTO Y SU NOTIFICACIÓN
// ==========================================
export const deleteExpenseEvent = async (eventId: string) => {
  const eventsCollection = database.get<Event>("events");
  const notificationsCollection = database.get<Notification>("notifications");

  // 1. Buscamos el evento y su notificación asociada FUERA del bloque write
  const event = await eventsCollection.find(eventId);
  const notifications = await notificationsCollection
    .query(Q.where("event_id", eventId))
    .fetch();

  // 2. Si hay una notificación, cancelamos la alarma en el Sistema Operativo primero
  if (notifications.length > 0) {
    const notification = notifications[0];
    if (notification.expoNotificationId) {
      await cancelScheduledNotification(notification.expoNotificationId);
    }
  }

  // 3. Ejecutamos la eliminación en la DB de forma síncrona
  await database.write(async () => {
    const batchOperations = [];

    // prepareMarkAsDeleted es mejor si planeas sincronizar con un backend futuro.
    // Si la app es 100% offline y nunca sincronizará, puedes usar prepareDestroyPermanently()
    if (notifications.length > 0) {
      batchOperations.push(notifications[0].prepareMarkAsDeleted());
    }

    batchOperations.push(event.prepareMarkAsDeleted());

    await database.batch(...batchOperations);
  });
};

// ==========================================
// ACTUALIZAR EVENTO (Y REPROGRAMAR ALARMA)
// ==========================================
interface UpdateEventParams {
  eventId: string;
  title: string;
  amount: number;
  targetTimestamp: number;
  category: string;
}

export const updateExpenseEvent = async (params: UpdateEventParams) => {
  const eventsCollection = database.get<Event>("events");
  const notificationsCollection = database.get<Notification>("notifications");

  // 1. Buscamos los registros actuales
  const event = await eventsCollection.find(params.eventId);
  const notifications = await notificationsCollection
    .query(Q.where("event_id", params.eventId))
    .fetch();

  let newExpoNotificationId: string | null = null;
  const existingNotification =
    notifications.length > 0 ? notifications[0] : null;

  // 2. Lógica de reprogramación de Expo
  // Si la fecha o el título cambiaron, la alarma del OS está desactualizada
  const dateChanged = event.startDate !== params.targetTimestamp;
  const titleChanged = event.title !== params.title;

  if (existingNotification && (dateChanged || titleChanged)) {
    // Cancelamos la vieja
    if (existingNotification.expoNotificationId) {
      await cancelScheduledNotification(
        existingNotification.expoNotificationId,
      );
    }
    // Programamos la nueva
    newExpoNotificationId = await scheduleEventNotification(
      params.title,
      params.amount,
      params.targetTimestamp,
      params.category,
    );
  }

  // 3. Persistimos los cambios en WatermelonDB
  await database.write(async () => {
    const batchOperations = [];

    // Preparamos la actualización del evento
    const updatedEvent = event.prepareUpdate((e) => {
      e.title = params.title;
      e.amount = params.amount;
      e.startDate = params.targetTimestamp;
      e.endDate = params.targetTimestamp;
      e.category = params.category;
    });
    batchOperations.push(updatedEvent);

    // Preparamos la actualización de la notificación (si existe y si generamos un nuevo ID)
    if (existingNotification && newExpoNotificationId) {
      const updatedNotif = existingNotification.prepareUpdate((n) => {
        n.expoNotificationId = newExpoNotificationId!;
        n.message = `Recordatorio de pago: ${params.title}`;
        n.sendDate = params.targetTimestamp;
      });
      batchOperations.push(updatedNotif);
    }

    await database.batch(...batchOperations);
  });
};
