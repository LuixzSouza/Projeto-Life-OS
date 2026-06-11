"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Plus, ChevronLeft, ChevronRight,
  Clock, CalendarPlus, ListTodo, Clock3, Loader2, ChevronDown,
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EventForm } from "@/components/agenda/event-form";
import { agendaUrl } from "@/components/agenda/agenda-shared";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import { createTask } from "@/app/(dashboard)/projects/actions/task";
import { cn } from "@/lib/utils";

interface AgendaHeaderProps {
  isSpecificDate: boolean;
  date: Date;
  /** Primeiro nome do usuário (G19) — null cai no tratamento padrão. */
  userName?: string | null;
}

// #5 Agenda+IA: prompt pronto "Organize minha semana" (a IA lê tarefas sem bloco
// e horários livres via tools e PROPÕE alocações — o usuário revisa e confirma).
const ORGANIZE_WEEK_PROMPT =
  "Organize minha semana: olhe minhas tarefas pendentes e os eventos já marcados na agenda e proponha em quais dias e horários encaixar cada coisa. Liste as sugestões antes de criar qualquer evento.";

export function AgendaHeader({ date, userName }: AgendaHeaderProps) {
  const router = useRouter();

  // --- NAVEGAÇÃO DE DATAS ---
  const handlePrevDay = () => router.push(agendaUrl(format(subDays(date, 1), 'yyyy-MM-dd')));
  const handleNextDay = () => router.push(agendaUrl(format(addDays(date, 1), 'yyyy-MM-dd')));
  const handleToday = () => router.push(agendaUrl(format(new Date(), 'yyyy-MM-dd')));

  // G20: "Registrar" cobre os 3 fluxos (Evento · Tarefa · Bloco agora) sem trocar de aba.
  const [dialog, setDialog] = useState<"event" | "block" | "task" | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPending, setTaskPending] = useState(false);

  // Bloco "agora": próximo slot de 15min (mesmo snap da grade de Blocos).
  const blockStart = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
    return d;
  };

  const createQuickTask = async () => {
    const clean = taskTitle.trim();
    if (!clean || taskPending) return;
    setTaskPending(true);
    try {
      const fd = new FormData();
      fd.set("title", clean);
      fd.set("dueDate", format(date, "yyyy-MM-dd"));
      await createTask(fd);
      toast.success(`Tarefa "${clean}" criada para ${format(date, "d 'de' MMMM", { locale: ptBR })}.`);
      setTaskTitle("");
      setDialog(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar a tarefa.");
    } finally {
      setTaskPending(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const who = userName || "Comandante";

  // Compacto no mobile (iPhone SE): saudação some, título menor e controles
  // numa linha só — o header não pode comer meia tela do celular.
  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-2.5 sm:px-6 sm:py-4 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">

        {/* BLOCO ESQUERDO: Saudação e Data */}
        <div className="min-w-0">
          <h2 className="hidden sm:flex text-[10px] font-black text-primary uppercase tracking-[0.2em] items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3" /> {greeting}, {who}.
          </h2>
          <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-foreground capitalize flex flex-wrap items-center gap-x-2">
            {format(date, "EEEE", { locale: ptBR })}
            <span className="text-muted-foreground/50 font-medium">
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </span>
          </h1>
        </div>

        {/* BLOCO DIREITO: Controles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
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

          {/* #5: a Agenda agora conversa com o Cérebro Digital */}
          <AskAiButton
            q={ORGANIZE_WEEK_PROMPT}
            label="Organizar com IA"
            title="A IA propõe onde encaixar suas tarefas na semana"
          />

          {/* Botão de Ação Primária (G20: menu — Evento · Tarefa · Bloco agora) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 sm:h-10 rounded-xl px-4 sm:px-5 bg-foreground text-background hover:bg-primary hover:text-white shadow-lg font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                <Plus className="h-4 w-4 mr-1.5 stroke-[3]" /> Registrar
                <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={() => setDialog("event")} className="gap-2.5 rounded-lg py-2.5 font-semibold">
                <CalendarPlus className="h-4 w-4 text-primary" /> Evento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog("task")} className="gap-2.5 rounded-lg py-2.5 font-semibold">
                <ListTodo className="h-4 w-4 text-emerald-500" /> Tarefa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog("block")} className="gap-2.5 rounded-lg py-2.5 font-semibold">
                <Clock3 className="h-4 w-4 text-amber-500" /> Bloco no horário atual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* DIÁLOGO ÚNICO: Evento ou Bloco agora (mesmo form, defaultStart diferente) */}
      <Dialog open={dialog === "event" || dialog === "block"} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] p-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100] overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tighter">
                  {dialog === "block" ? "Bloco agora" : "Novo Evento"}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Alocação de Tempo
                </DialogDescription>
              </div>
            </div>
          </div>
          {/* EventForm se auto-gerencia na rolagem */}
          {dialog === "block"
            ? <EventForm onClose={() => setDialog(null)} defaultStart={blockStart()} />
            : <EventForm onClose={() => setDialog(null)} />}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: tarefa rápida (título + Enter — fricção zero) */}
      <Dialog open={dialog === "task"} onOpenChange={(o) => { if (!o && !taskPending) setDialog(null); }}>
        <DialogContent className="w-[95%] max-w-[420px] rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tighter">Tarefa rápida</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 capitalize">
                vence {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createQuickTask(); } }}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
            <Button onClick={createQuickTask} disabled={taskPending || !taskTitle.trim()} className="shrink-0 rounded-xl">
              {taskPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}