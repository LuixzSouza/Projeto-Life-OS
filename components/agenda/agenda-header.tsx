"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList, 
  Grid3X3,
  CalendarDays,
  Clock
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/agenda/event-form";
import { cn } from "@/lib/utils";

interface AgendaHeaderProps {
  isSpecificDate: boolean;
  date: Date;
}

export function AgendaHeader({ isSpecificDate, date }: AgendaHeaderProps) {
  const router = useRouter();

  // Navegação de Datas
  const handlePrevDay = () => {
    const newDate = subDays(date, 1);
    router.push(`/agenda?date=${format(newDate, 'yyyy-MM-dd')}`);
  };

  const handleNextDay = () => {
    const newDate = addDays(date, 1);
    router.push(`/agenda?date=${format(newDate, 'yyyy-MM-dd')}`);
  };

  const handleToday = () => {
    router.push('/agenda');
  };

  // Saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    // ESTILO RESTAURADO CONFORME SOLICITADO + Sticky para UX
    <header className="sticky top-0 z-30 flex flex-col gap-6 border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8 backdrop-blur-sm">
      
      {/* 1. Linha Superior: Título, Saudação e Botão de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Saudação Sutil */}
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {getGreeting()}, aqui está sua agenda.
          </h2>
          
          {/* Data em Destaque */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
            {format(date, "EEEE", { locale: ptBR })}
            <span className="text-muted-foreground font-normal ml-2">
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </span>
          </h1>
        </div>

        {/* Botão de Novo Evento */}
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:scale-105">
                <Plus className="h-4 w-4 mr-2" /> Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Novo Compromisso</DialogTitle>
                <DialogDescription>O que você vai fazer?</DialogDescription>
              </DialogHeader>
              <EventForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. Linha Inferior: Controles de Navegação e Visualização */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
        
        {/* Navegação (< Hoje >) */}
        <div className="flex items-center bg-background/50 p-1 rounded-lg border border-border/50 shadow-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevDay}
            className="h-8 w-8 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleToday}
            className={cn(
              "h-8 px-4 text-xs font-semibold uppercase tracking-wider hover:bg-muted transition-all",
              isSameDay(date, new Date()) ? "text-primary font-bold bg-primary/10" : "text-muted-foreground"
            )}
          >
            Hoje
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextDay}
            className="h-8 w-8 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtros e Visualização */}
        <div className="flex items-center gap-3">
          {isSpecificDate && (
             <Link href="/agenda">
               <Button variant="outline" size="sm" className="h-9 gap-2 text-muted-foreground border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors">
                 <CalendarIcon className="h-3.5 w-3.5" />
                 Voltar para Hoje
               </Button>
             </Link>
          )} 

          {/* Separador */}
          <div className="h-6 w-px bg-border/60 hidden md:block" />

          {/* Tabs de Visualização (Day/Week/Month) */}
          <Tabs defaultValue="day" className="w-auto">
            <TabsList className="h-9 bg-muted/50 p-1">
              <TabsTrigger value="day" className="text-xs px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutList className="h-3.5 w-3.5 mr-2" /> Dia
              </TabsTrigger>
              <TabsTrigger value="week" disabled className="text-xs px-3 opacity-50 cursor-not-allowed">
                <CalendarDays className="h-3.5 w-3.5 mr-2" /> Semana
              </TabsTrigger>
              <TabsTrigger value="month" disabled className="text-xs px-3 opacity-50 cursor-not-allowed">
                <Grid3X3 className="h-3.5 w-3.5 mr-2" /> Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </header>
  );
}