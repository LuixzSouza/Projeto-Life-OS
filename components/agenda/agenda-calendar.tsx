"use client";

import { Calendar } from "@/components/ui/calendar";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendaCalendarProps {
  bookedDays: Date[]; 
}

export function AgendaCalendar({ bookedDays }: AgendaCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00") : undefined;

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const formatted = format(newDate, "yyyy-MM-dd");
      router.push(`/agenda?date=${formatted}`);
    } else {
      router.push("/agenda");
    }
  };

  return (
    <div className="flex justify-center w-full bg-transparent">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          className="p-0 font-medium"
          locale={ptBR}
          modifiers={{ booked: bookedDays }}
          modifiersClassNames={{
            // Design premium para o marcador de dias ocupados (um traço sutil primário)
            booked: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-3 after:h-[2px] after:bg-primary/50 after:rounded-full aria-selected:after:bg-primary-foreground",
          }}
        />
    </div>
  );
}