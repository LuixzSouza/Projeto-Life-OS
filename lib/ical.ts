// Feed iCal (ICS) da Agenda unificada — server-only.
// O calendário do celular/Google assina uma URL com token assinado (HMAC sobre
// userId + tokenVersion com o JWT_SECRET): sem sessão/cookie, sem dado novo no
// banco, e "Desconectar outros dispositivos" (que gira o tokenVersion) também
// renova o link — revogação de graça.

import { createHmac, timingSafeEqual } from "crypto";
import { CATEGORY_META, type AgendaItem } from "@/components/agenda/agenda-shared";

const SIG_LENGTH = 32; // hex chars (128 bits do HMAC-SHA256 — suficiente p/ URL)

function sign(userId: string, tokenVersion: number): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`ical:v1:${userId}:${tokenVersion}`)
    .digest("hex")
    .slice(0, SIG_LENGTH);
}

/** Token da URL do feed: `<userId>.<assinatura>` (null se JWT_SECRET ausente). */
export function makeCalendarToken(userId: string, tokenVersion: number): string | null {
  const sig = sign(userId, tokenVersion);
  return sig ? `${userId}.${sig}` : null;
}

/** Aceita o token com ou sem o sufixo cosmético `.ics`. */
export function parseCalendarToken(raw: string): { userId: string; sig: string } | null {
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!userId || sig.length !== SIG_LENGTH) return null;
  return { userId, sig };
}

export function verifyCalendarSignature(userId: string, tokenVersion: number, sig: string): boolean {
  const expected = sign(userId, tokenVersion);
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Geração do ICS (RFC 5545)
// ---------------------------------------------------------------------------

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Folding: linhas com mais de 75 octetos continuam na seguinte com 1 espaço.
// Cortamos por código UTF-16 (conservador o bastante p/ clientes reais).
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Instante em UTC: 20260611T180000Z. */
function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Dia local do servidor (eventos de dia inteiro): 20260611. */
function fmtLocalDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// O id agregado vira UID estável (mesmo item = mesmo UID a cada sync).
function uidOf(item: AgendaItem): string {
  return `${item.id.replace(/[^A-Za-z0-9._-]/g, "_")}@life-os`;
}

const DEFAULT_EVENT_MS = 60 * 60 * 1000; // o feed não guarda duração — 1h padrão

/** Monta o calendário completo a partir dos itens da Agenda unificada. */
export function buildIcs(items: AgendaItem[], calendarName: string): string {
  const stamp = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life OS//Agenda Unificada//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${icsEscape(calendarName)}`),
    // Dica de atualização p/ clientes que respeitam (Apple/Outlook).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const item of items) {
    const start = new Date(item.date);
    if (Number.isNaN(start.getTime())) continue;

    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:${uidOf(item)}`));
    lines.push(`DTSTAMP:${stamp}`);

    if (item.time === null) {
      // Dia inteiro: DTEND exclusivo no dia seguinte (RFC 5545).
      const next = new Date(start);
      next.setDate(next.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${fmtLocalDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${fmtLocalDate(next)}`);
    } else {
      lines.push(`DTSTART:${fmtUtc(start)}`);
      lines.push(`DTEND:${fmtUtc(new Date(start.getTime() + DEFAULT_EVENT_MS))}`);
    }

    lines.push(fold(`SUMMARY:${icsEscape(item.title)}`));
    const description = [item.subtitle, item.meta].filter(Boolean).join(" · ");
    if (description) lines.push(fold(`DESCRIPTION:${icsEscape(description)}`));
    lines.push(fold(`CATEGORIES:${icsEscape(CATEGORY_META[item.source].label)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
