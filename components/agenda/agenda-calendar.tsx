"use client";

import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { agendaUrl } from "./agenda-shared";

/** Dia com registros + quantos (G21: o traço vira intensidade, não binário). */
export interface BusyDay {
  date: Date;
  count: number;
}

interface AgendaCalendarProps {
  busyDays: BusyDay[];
}

export function AgendaCalendar({ busyDays }: AgendaCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00") : undefined;

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      router.push(agendaUrl(format(newDate, "yyyy-MM-dd")));
    } else {
      router.push(agendaUrl(format(new Date(), "yyyy-MM-dd")));
    }
  };

  // G21: mini-heatmap de vida registrada — 3 faixas de intensidade.
  const tiers = useMemo(() => ({
    light: busyDays.filter((b) => b.count <= 2).map((b) => b.date),
    mid: busyDays.filter((b) => b.count > 2 && b.count < 5).map((b) => b.date),
    heavy: busyDays.filter((b) => b.count >= 5).map((b) => b.date),
  }), [busyDays]);

  const dash = (cls: string) =>
    `relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:rounded-full aria-selected:after:bg-primary-foreground ${cls}`;

  return (
    <div className="flex justify-center w-full bg-transparent">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          className="p-0 font-medium"
          locale={ptBR}
          modifiers={{ booked1: tiers.light, booked2: tiers.mid, booked3: tiers.heavy }}
          modifiersClassNames={{
            booked1: dash("after:w-2 after:bg-primary/30"),
            booked2: dash("after:w-3 after:bg-primary/60"),
            booked3: dash("after:w-4 after:bg-primary"),
          }}
        />
    </div>
  );
}
