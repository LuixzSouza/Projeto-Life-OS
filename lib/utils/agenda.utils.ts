// src/lib/utils/agenda.utils.ts
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrismaEvent, DashboardEventResult } from "@/components/dashboard/types";
import { parseSafeDate } from "./date.utils";

/**
 * Mapeia e traduz datas absolutas para rótulos legíveis em português.
 */
function getDateLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "dd MMM", { locale: ptBR });
}

/**
 * Formata um evento do banco de dados gerando as strings de exibição padronizadas.
 */
export function formatNextEvent(event: PrismaEvent | null | undefined): DashboardEventResult {
  const fallbackText = "Nenhum compromisso pendente";
  
  if (!event) {
    return { title: "Agenda Livre", time: fallbackText, relative: "", isEmpty: true };
  }

  const eventDate = parseSafeDate(event.startTime);
  if (!eventDate) {
    return { title: "Agenda Livre", time: fallbackText, relative: "", isEmpty: true };
  }

  const timeString = format(eventDate, "HH:mm", { locale: ptBR });
  const dateLabel = getDateLabel(eventDate);
  const relativeDistance = formatDistanceToNow(eventDate, { addSuffix: true, locale: ptBR });

  return {
    title: event.title,
    time: `${dateLabel} às ${timeString}`,
    relative: relativeDistance,
    isEmpty: false
  };
}