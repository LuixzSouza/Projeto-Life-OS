"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Filter, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { EventForm } from "@/components/agenda/event-form";

interface AgendaHeaderProps {
  isSpecificDate: boolean;
  date: Date;
}

export function AgendaHeader({ isSpecificDate, date }: AgendaHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agenda</h1>
        <p className="text-muted-foreground mt-1 text-lg capitalize flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 opacity-70" />
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {isSpecificDate && (
          <Link href="/agenda">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Filter className="h-4 w-4" /> Limpar Filtro
            </Button>
          </Link>
        )}
        
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
    </header>
  );
}