// Entrega de notificações por e-mail (opt-in) — "receber no celular".
// ----------------------------------------------------------------------------
// O usuário configura, nas Configurações, um SMTP próprio (ex.: Gmail + senha de
// app) e um destino. Os avisos IMPORTANTES (>= notifyMinPriority) recém-criados
// são despachados em um resumo. Idempotente via Notification.emailedAt: cada
// notificação é enviada no máximo uma vez. Privacy-first: nada de servidor de
// e-mail nosso — as credenciais são do próprio usuário e ficam cifradas at-rest.

import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decryptKey } from "./settings-crypto";

export type NotifyPriority = "LOW" | "NORMAL" | "HIGH";

const PRIORITY_RANK: Record<string, number> = { LOW: 0, NORMAL: 1, HIGH: 2 };

// Só DISPARA itens criados nas últimas horas. Itens mais antigos que caírem na
// peneira (ex.: ao ativar o recurso pela 1ª vez) são apenas marcados como
// despachados — nunca reenviados retroativamente para não "explodir" a caixa.
const SEND_WINDOW_MS = 6 * 3600 * 1000;

// Throttle em memória por usuário: o tick do badge chama isto a cada ~90s, mas
// só tentamos despachar de tempos em tempos (envio novo só existe quando há
// notificação nova de qualquer forma, mas evita transporte/queries à toa).
const lastDispatch = new Map<string, number>();
const DISPATCH_THROTTLE_MS = 4 * 60 * 1000;

interface ResolvedConfig {
  to: string;
  host: string;
  port: number;
  user: string;
  pass: string;
}

/** Monta o transporte SMTP. `secure` liga TLS implícito na 465 (padrão Gmail). */
function makeTransport(cfg: ResolvedConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/** Escapa texto do usuário para o corpo HTML do e-mail. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

interface DigestItem {
  title: string;
  body: string | null;
  priority: string;
}

/** Monta assunto + corpo (texto e HTML) de um lote de notificações. */
function buildDigest(items: DigestItem[]): { subject: string; text: string; html: string } {
  const subject =
    items.length === 1 ? items[0].title : `${items.length} novos avisos no Life OS`;

  const text = items
    .map((n) => `• ${n.title}${n.body ? `\n  ${n.body}` : ""}`)
    .join("\n\n");

  const rows = items
    .map((n) => {
      const flag = n.priority === "HIGH" ? "🔴" : "🔔";
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #eee">
        <div style="font-weight:600;font-size:15px;color:#111">${flag} ${esc(n.title)}</div>
        ${n.body ? `<div style="font-size:13px;color:#666;margin-top:2px">${esc(n.body)}</div>` : ""}
      </td></tr>`;
    })
    .join("");

  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999;font-weight:700">Life OS</div>
    <h2 style="font-size:18px;color:#111;margin:6px 0 12px">${items.length === 1 ? "Novo aviso" : `${items.length} novos avisos`}</h2>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="font-size:12px;color:#999;margin-top:20px">Você recebeu este e-mail porque ativou notificações por e-mail no Life OS.</p>
  </div>`;

  return { subject, text, html };
}

/** Carrega e valida a config de e-mail do usuário. null = incompleta/desligada. */
async function resolveConfig(userId: string): Promise<ResolvedConfig | null> {
  const s = await prisma.settings.findUnique({
    where: { userId },
    select: {
      notifyEmailEnabled: true, notifyEmail: true, notifySmtpHost: true,
      notifySmtpPort: true, notifySmtpUser: true, notifySmtpPass: true,
    },
  });
  if (!s || !s.notifyEmailEnabled) return null;
  const user = s.notifySmtpUser?.trim();
  const host = s.notifySmtpHost?.trim() || "smtp.gmail.com";
  const to = (s.notifyEmail?.trim() || user) ?? "";
  const pass = decryptKey(s.notifySmtpPass) ?? "";
  const port = s.notifySmtpPort ?? 465;
  if (!to || !user || !pass) return null;
  return { to, host, port, user, pass };
}

/**
 * Despacha por e-mail as notificações importantes recém-criadas do usuário.
 * Best-effort, throttled e idempotente. Retorna quantas foram enviadas.
 */
export async function dispatchNotificationEmails(
  userId: string,
  opts: { force?: boolean } = {},
): Promise<{ sent: number }> {
  if (!opts.force) {
    const last = lastDispatch.get(userId) ?? 0;
    if (Date.now() - last < DISPATCH_THROTTLE_MS) return { sent: 0 };
  }
  lastDispatch.set(userId, Date.now());

  const s = await prisma.settings.findUnique({
    where: { userId },
    select: { notifyEmailEnabled: true, notifyMinPriority: true },
  });
  if (!s?.notifyEmailEnabled) return { sent: 0 };
  const minRank = PRIORITY_RANK[s.notifyMinPriority] ?? 2;

  const cfg = await resolveConfig(userId);
  if (!cfg) return { sent: 0 };

  const candidates = await prisma.notification.findMany({
    where: { userId, readAt: null, emailedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, body: true, priority: true, createdAt: true },
  });
  const eligible = candidates.filter((n) => (PRIORITY_RANK[n.priority] ?? 1) >= minRank);
  if (eligible.length === 0) return { sent: 0 };

  const cutoff = Date.now() - SEND_WINDOW_MS;
  const toSend = eligible.filter((n) => n.createdAt.getTime() >= cutoff);
  const staleIds = eligible.filter((n) => n.createdAt.getTime() < cutoff).map((n) => n.id);

  let sent = 0;
  if (toSend.length > 0) {
    try {
      const { subject, text, html } = buildDigest(toSend);
      await makeTransport(cfg).sendMail({
        from: `"Life OS" <${cfg.user}>`,
        to: cfg.to,
        subject,
        text,
        html,
      });
      sent = toSend.length;
    } catch (e) {
      console.warn("[notify-email] envio falhou (tentará de novo):", e);
      // Não marca os que iam ser enviados — retenta no próximo ciclo. Marca só os
      // antigos-fora-da-janela, que não seriam enviados de qualquer jeito.
      if (staleIds.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: staleIds }, userId }, data: { emailedAt: new Date() },
        });
      }
      return { sent: 0 };
    }
  }

  // Sucesso (ou nada dentro da janela): marca todos os elegíveis como despachados.
  await prisma.notification.updateMany({
    where: { id: { in: eligible.map((n) => n.id) }, userId },
    data: { emailedAt: new Date() },
  });
  return { sent };
}

export interface TestEmailOverride {
  to?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string; // texto puro digitado no form; vazio = usar a senha salva
}

/**
 * Envia um e-mail de teste. Usa os valores passados (do formulário, antes de
 * salvar) e completa o que faltar com a config salva. Retorna erro legível.
 */
export async function sendTestEmail(
  userId: string,
  override: TestEmailOverride = {},
): Promise<{ ok: boolean; error?: string }> {
  const saved = await prisma.settings.findUnique({
    where: { userId },
    select: {
      notifyEmail: true, notifySmtpHost: true, notifySmtpPort: true,
      notifySmtpUser: true, notifySmtpPass: true,
    },
  });

  const user = (override.user?.trim() || saved?.notifySmtpUser?.trim()) ?? "";
  const host = (override.host?.trim() || saved?.notifySmtpHost?.trim()) || "smtp.gmail.com";
  const to = (override.to?.trim() || saved?.notifyEmail?.trim() || user) ?? "";
  const port = override.port || saved?.notifySmtpPort || 465;
  const pass = (override.pass?.trim() || decryptKey(saved?.notifySmtpPass) || "").trim();

  if (!user) return { ok: false, error: "Informe o e-mail remetente (conta SMTP)." };
  if (!pass) return { ok: false, error: "Informe a senha de app do e-mail." };
  if (!to) return { ok: false, error: "Informe o e-mail de destino." };

  try {
    await makeTransport({ to, host, port, user, pass }).sendMail({
      from: `"Life OS" <${user}>`,
      to,
      subject: "✅ Teste de notificação — Life OS",
      text: "Funcionou! A partir de agora seus avisos importantes chegam por aqui.",
      html: `<div style="font-family:system-ui,sans-serif">
        <h2 style="color:#111">✅ Tudo certo!</h2>
        <p style="color:#444">A partir de agora seus avisos importantes do Life OS chegam neste e-mail — e no seu celular.</p>
      </div>`,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao enviar.";
    return { ok: false, error: msg };
  }
}
