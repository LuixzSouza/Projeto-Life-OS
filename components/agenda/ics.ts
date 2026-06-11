// Exportação .ics (#10 do AGENDA_ROADMAP) — local-first: o arquivo é gerado
// no navegador, sem serviço externo. Importável no Google Calendar/Outlook.
// Client-safe: sem imports de servidor.

import type { EditableAgendaEvent } from "./unified-agenda";

/** Escapa texto para o formato iCalendar (RFC 5545). */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Data-hora em UTC no formato compacto do ICS (20260610T120000Z). */
function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Data local AAAAMMDD (eventos de dia inteiro usam VALUE=DATE). */
function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** RRULE equivalente à frequência do lib/recurrence.ts. */
function rrule(frequency: string, recurrenceEnd: string | null): string | null {
  const base: Record<string, string> = {
    WEEKLY: "FREQ=WEEKLY",
    MONTHLY: "FREQ=MONTHLY",
    QUARTERLY: "FREQ=MONTHLY;INTERVAL=3",
    SEMIANNUAL: "FREQ=MONTHLY;INTERVAL=6",
    ANNUAL: "FREQ=YEARLY",
  };
  const rule = base[frequency];
  if (!rule) return null;
  return recurrenceEnd ? `${rule};UNTIL=${utc(new Date(recurrenceEnd))}` : rule;
}

/** Monta o conteúdo do calendário com os eventos informados. */
export function buildIcs(events: EditableAgendaEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life OS//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
  ];

  for (const e of events) {
    const start = new Date(e.startTime);
    const end = e.endTime ? new Date(e.endTime) : new Date(start.getTime() + 3_600_000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@lifeos`);
    lines.push(`DTSTAMP:${utc(new Date(start))}`);
    if (e.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${ymd(start)}`);
    } else {
      lines.push(`DTSTART:${utc(start)}`);
      lines.push(`DTEND:${utc(end)}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.frequency) {
      const rule = rrule(e.frequency, e.recurrenceEnd);
      if (rule) lines.push(`RRULE:${rule}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC pede CRLF entre linhas.
  return lines.join("\r\n");
}

/** Dispara o download do .ics no navegador. */
export function downloadIcs(events: EditableAgendaEvent[], filename: string): void {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
