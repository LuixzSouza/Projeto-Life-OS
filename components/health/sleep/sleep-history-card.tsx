"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Zap } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SleepEntry } from "./sleep-types";

interface SleepHistoryCardProps {
  data: SleepEntry[];
  onDelete: (id: string) => void;
}

const getQualityColor = (hours: number) => {
  if (hours >= 7 && hours <= 9) return "text-primary";
  if (hours >= 6) return "text-amber-500";
  return "text-destructive";
};

const getQualityBg = (hours: number) => {
  if (hours >= 7 && hours <= 9) return "bg-primary";
  if (hours >= 6) return "bg-amber-500";
  return "bg-destructive";
};

export function SleepHistoryCard({ data, onDelete }: SleepHistoryCardProps) {
  return (
    <Card className="flex-1 border-border/60 bg-card shadow-sm flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/40">
          {data.slice().reverse().map((entry) => {
            const parsedDate = parseISO(entry.date);
            return (
              <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn("w-1 h-8 rounded-full", getQualityBg(entry.value))}></div>
                  <div>
                    <p className="text-sm font-bold text-foreground capitalize">
                      {format(parsedDate, "EEEE", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parsedDate, "d 'de' MMM")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("font-mono font-bold text-lg", getQualityColor(entry.value))}>
                    {entry.value}h
                  </span>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm opacity-60">
              <Zap className="h-6 w-6 mb-2" />
              Sem registros recentes.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
