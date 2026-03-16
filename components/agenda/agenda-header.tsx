"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, CalendarPlus
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/agenda/event-form";
import { cn } from "@/lib/utils";

interface AgendaHeaderProps {
  isSpecificDate: boolean;
  date: Date;
}

export function AgendaHeader({ isSpecificDate, date }: AgendaHeaderProps) {
  const router = useRouter();

  // --- NAVEGAÇÃO DE DATAS ---
  const handlePrevDay = () => router.push(`/agenda?date=${format(subDays(date, 1), 'yyyy-MM-dd')}`);
  const handleNextDay = () => router.push(`/agenda?date=${format(addDays(date, 1), 'yyyy-MM-dd')}`);
  const handleToday = () => router.push('/agenda');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b border-border/40 px-6 py-4 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* BLOCO ESQUERDO: Saudação e Data */}
        <div>
          <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3" /> {greeting}, Comandante.
          </h2>
          <h1 className="text-2xl font-black tracking-tighter text-foreground capitalize flex items-center gap-2">
            {format(date, "EEEE", { locale: ptBR })}
            <span className="text-muted-foreground/50 font-medium">
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </span>
          </h1>
        </div>

        {/* BLOCO DIREITO: Controles */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Navegador de Dias (Control Group) */}
          <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/40 shadow-inner">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 rounded-lg hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" onClick={handleToday} className={cn(
                "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                isSameDay(date, new Date()) 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm"
              )}>
              Hoje
            </Button>

            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 rounded-lg hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-border/40 hidden md:block mx-1" />

          {/* Botão de Ação Primária */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl px-5 bg-foreground text-background hover:bg-primary hover:text-white shadow-lg font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                <Plus className="h-4 w-4 mr-1.5 stroke-[3]" /> Registrar
              </Button>
            </DialogTrigger>
            
            {/* MODAL CORRIGIDO: Agora usa flex-col e altura máxima para o form rolar dentro dele sem cortar */}
            <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] p-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                    <CalendarPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-tighter">Novo Evento</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Alocação de Tempo</DialogDescription>
                  </div>
                </div>
              </div>
              
              {/* EventForm se auto-gerencia na rolagem agora */}
              <EventForm />
              
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </header>
  );
}