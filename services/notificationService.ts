import { runBatch } from "@/database/batch";
import { NotificationRepository } from "@/repositories/notifications";

export interface NotificationRow {
  id: string;
  type: string;
  message: string;
  sendDate: number;
  isRead: boolean;
  eventId: string | null;
  goalId: string | null;
}

/** Últimas notificaciones del usuario (más recientes primero). */
export async function getNotifications(
  userId: string,
  limit = 20
): Promise<NotificationRow[]> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  const rows = await NotificationRepository.buildRecentByUserIdQuery(
    userId,
    safeLimit
  ).fetch();

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    sendDate: n.sendDate,
    isRead: n.isRead,
    eventId: n.eventId,
    goalId: n.goalId,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return await NotificationRepository.buildUnreadByUserIdQuery(
    userId
  ).fetchCount();
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  await NotificationRepository.update(notificationId, { isRead: true });
}

/** Marca todas las no leídas del usuario en una sola transacción. */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const unread = await NotificationRepository.buildUnreadByUserIdQuery(
    userId
  ).fetch();

  if (unread.length === 0) return;

  await runBatch(
    ...unread.map((notification) =>
      NotificationRepository.prepareUpdate(notification, { isRead: true })
    )
  );
}

export async function deleteNotification(
  notificationId: string
): Promise<void> {
  await NotificationRepository.delete(notificationId);
}
