"use server";

import {
  getNotificationInbox,
  markRead,
  markAllRead,
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
