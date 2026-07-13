"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { encryptKey } from "@/lib/settings-crypto";
import { sendTestEmail } from "@/lib/notify-email";
import { revalidatePath } from "next/cache";

export interface NotifyEmailInput {
  enabled: boolean;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string; // texto puro; string vazia = manter a senha já salva
  minPriority: "LOW" | "NORMAL" | "HIGH";
}

/** Salva a configuração de entrega por e-mail. A senha só é sobrescrita se uma
 *  nova for digitada (evita perder a senha ao reeditar outros campos). */
export async function saveNotificationSettings(
  input: NotifyEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  if (input.enabled) {
    if (!input.smtpUser?.trim()) return { ok: false, error: "Informe o e-mail remetente (conta SMTP)." };
    const hasPass = !!input.smtpPass?.trim();
    const prevPass = await prisma.settings.findUnique({ where: { userId }, select: { notifySmtpPass: true } });
    if (!hasPass && !prevPass?.notifySmtpPass) {
      return { ok: false, error: "Informe a senha de app do e-mail." };
    }
  }

  const prev = await prisma.settings.findUnique({
    where: { userId },
    select: { notifyEmailEnabled: true },
  });

  const common = {
    notifyEmailEnabled: input.enabled,
    notifyEmail: input.email?.trim() || null,
    notifySmtpHost: input.smtpHost?.trim() || "smtp.gmail.com",
    notifySmtpPort: Number.isFinite(input.smtpPort) && input.smtpPort > 0 ? input.smtpPort : 465,
    notifySmtpUser: input.smtpUser?.trim() || null,
    notifyMinPriority: input.minPriority || "HIGH",
    // Só grava a senha (cifrada) quando o usuário digitou uma nova.
    ...(input.smtpPass?.trim() ? { notifySmtpPass: encryptKey(input.smtpPass) } : {}),
  };

  await prisma.settings.upsert({
    where: { userId },
    update: common,
    create: { userId, ...common },
  });

  // Ao LIGAR pela primeira vez, marca as notificações já existentes como
  // despachadas — assim ativar o recurso não dispara um monte de e-mail antigo.
  if (input.enabled && !prev?.notifyEmailEnabled) {
    await prisma.notification.updateMany({
      where: { userId, emailedAt: null },
      data: { emailedAt: new Date() },
    });
  }

  revalidatePath("/settings");
  return { ok: true };
}

/** Envia um e-mail de teste com os valores atuais do formulário (senha opcional:
 *  se vazia, usa a já salva). */
export async function sendTestNotificationEmail(
  input: Omit<NotifyEmailInput, "enabled" | "minPriority">,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };
  return sendTestEmail(userId, {
    to: input.email,
    host: input.smtpHost,
    port: input.smtpPort,
    user: input.smtpUser,
    pass: input.smtpPass,
  });
}
