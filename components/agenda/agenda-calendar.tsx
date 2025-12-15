"use client";

import { Calendar } from "@/components/ui/calendar";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendaCalendarProps {
  bookedDays: Date[]; // Lista de datas que têm eventos
}

export function AgendaCalendar({ bookedDays }: AgendaCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. LER DIRETAMENTE DA URL
  const dateParam = searchParams.get("date");
  
  // Convertendo string da URL para objeto Date (adicionando T00:00:00 para evitar problemas de fuso horário)
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
    <div className="flex justify-center w-full">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          className="p-0" // Remove padding extra do componente base
          locale={ptBR}
          
          // Define quais dias recebem o modificador "booked"
          modifiers={{
            booked: bookedDays
          }}
          
          // Estilização Dinâmica com Variáveis CSS (bg-primary)
          modifiersClassNames={{
            booked: 
              "relative after:content-[''] after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full after:opacity-100 aria-selected:after:bg-primary-foreground",
          }}
        />
    </div>
  );
}