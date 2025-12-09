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
  
  // 1. LER DIRETAMENTE DA URL (Sem useState/useEffect)
  // Isso elimina o erro de "cascading renders". A URL é a fonte da verdade.
  const dateParam = searchParams.get("date");
  
  // Convertendo string da URL para objeto Date (adicionando T00:00:00 para evitar problemas de fuso horário)
  const date = dateParam ? new Date(dateParam + "T00:00:00") : undefined;

  const handleSelect = (newDate: Date | undefined) => {
    // Ao clicar, apenas atualizamos a URL.
    // O Next.js detecta a mudança na URL e re-renderiza este componente automaticamente com o novo "date" calculado acima.
    if (newDate) {
      const formatted = format(newDate, "yyyy-MM-dd");
      router.push(`/agenda?date=${formatted}`);
    } else {
      router.push("/agenda");
    }
  };

  return (
    <Calendar
      mode="single"
      selected={date} // Passamos a variável calculada
      onSelect={handleSelect}
      className="w-full"
      locale={ptBR}
      
      // Define quais dias recebem o modificador "booked"
      modifiers={{
        booked: bookedDays
      }}
      
      // Estilização Criativa com Tailwind
      modifiersClassNames={{
        booked: 
          "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-indigo-500 after:rounded-full after:opacity-100 aria-selected:after:bg-white",
      }}
    />
  );
}