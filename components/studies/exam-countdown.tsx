"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarClock, Plus, Trash2, GraduationCap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

const STORAGE_KEY = "lifeos.examCountdown.v1";

function readExams(): ExamItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ExamItem[];
  } catch {
    /* localStorage indisponível */
  }
  return [];
}

// Dias inteiros entre hoje (local, meia-noite) e a data da prova.
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Contagem regressiva para provas (ENEM, vestibular, concurso…). Guardado no
 * localStorage — nada de schema novo. Mostra os dias que faltam, ordenado pela
 * prova mais próxima, com a mais urgente em destaque. Motivação à la Google
 * Agenda + a ansiedade boa do vestibulando ("faltam X dias").
 */
export function ExamCountdown() {
  const [exams, setExams] = useState<ExamItem[]>(() => readExams());
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  const save = (list: ExamItem[]) => {
    setExams(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignora falha de persistência */
    }
  };

  const addExam = () => {
    if (!name.trim() || !date) return;
    const item: ExamItem = { id: crypto.randomUUID(), name: name.trim().slice(0, 40), date };
    save([...exams, item]);
    setName("");
    setDate("");
    setOpen(false);
  };

  const removeExam = (id: string) => save(exams.filter((e) => e.id !== id));

  // Futuras primeiro (mais próximas na frente); provas passadas vão pro fim.
  const sorted = [...exams].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const upcoming = sorted.filter((e) => daysUntil(e.date) >= 0);
  const nearestId = upcoming[0]?.id;

  const addButton = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-xl border-dashed border-border/60 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar prova
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 rounded-2xl p-4">
        <p className="text-sm font-semibold">Nova contagem regressiva</p>
        <div className="space-y-2">
          <Input placeholder="Ex.: ENEM, Fuvest, Concurso…" value={name} onChange={(e) => setName(e.target.value)} className="h-9" onKeyDown={(e) => { if (e.key === "Enter") addExam(); }} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        </div>
        <Button onClick={addExam} disabled={!name.trim() || !date} className="w-full h-9 rounded-lg font-semibold">
          Adicionar
        </Button>
      </PopoverContent>
    </Popover>
  );

  // Estado vazio: um convite discreto a cadastrar a primeira prova.
  if (exams.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Contagem regressiva de provas</p>
              <p className="text-xs text-muted-foreground">Cadastre o ENEM, vestibular ou concurso e veja quantos dias faltam.</p>
            </div>
          </div>
          {addButton}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" /> Contagem regressiva
          </p>
          {addButton}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {sorted.map((exam) => {
            const days = daysUntil(exam.date);
            const isPast = days < 0;
            const isToday = days === 0;
            const isNearest = exam.id === nearestId;
            return (
              <div
                key={exam.id}
                className={cn(
                  "group relative min-w-[140px] shrink-0 rounded-xl border p-3.5 transition-colors",
                  isPast ? "border-border/40 bg-muted/20 opacity-60"
                    : isNearest ? "border-primary/40 bg-primary/[0.07]" : "border-border/40 bg-muted/20",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isNearest && !isPast ? <Flame className="h-3.5 w-3.5 text-primary" /> : <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="truncate text-xs font-semibold">{exam.name}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  {isToday ? (
                    <span className="text-lg font-black text-primary">É hoje! 🎯</span>
                  ) : isPast ? (
                    <span className="text-sm font-semibold text-muted-foreground">já passou</span>
                  ) : (
                    <>
                      <span className={cn("text-2xl font-black tabular-nums", isNearest ? "text-primary" : "text-foreground")}>{days}</span>
                      <span className="text-xs font-medium text-muted-foreground">{days === 1 ? "dia" : "dias"}</span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(exam.date)}</p>
                <button
                  type="button"
                  onClick={() => removeExam(exam.id)}
                  aria-label={`Remover ${exam.name}`}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
