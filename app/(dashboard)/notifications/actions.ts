"use server";

import {
  getNotificationInbox,
  markRead,
  markAllRead,
  deleteNotification,
  clearReadNotifications,
  generateReminders,
  type NotificationInbox,
} from "@/lib/notifications";

export async function refreshInboxAction(): Promise<NotificationInbox> {
  return getNotificationInbox();
}

export async function markReadAction(id: string): Promise<NotificationInbox> {
  await markRead(id);
  return getNotificationInbox();
}

export async function markAllReadAction(): Promise<NotificationInbox> {
  await markAllRead();
  return getNotificationInbox();
}

export async function generateRemindersAction(): Promise<NotificationInbox> {
  await generateReminders();
  return getNotificationInbox();
}

/**
 * Tick leve do badge ao vivo: gera só os lembretes determinísticos (sem a cauda
 * de IA/backup) e devolve a caixa atualizada. Chamado em intervalo pelo sino.
 */
export async function tickInboxAction(): Promise<NotificationInbox> {
  await generateReminders({ heavy: false });
  return getNotificationInbox();
}

export async function deleteNotificationAction(id: string): Promise<NotificationInbox> {
  await deleteNotification(id);
  return getNotificationInbox();
}

export async function clearReadAction(): Promise<NotificationInbox> {
  await clearReadNotifications();
  return getNotificationInbox();
}
