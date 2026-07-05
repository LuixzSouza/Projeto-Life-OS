"use client";

// Seletor de versão de currículo — lista de rádio reutilizada no modal
// "Candidatei-me" e na aba "Currículo Enviado" da vaga.

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumeRecord } from "@/app/(dashboard)/jobs/resume-actions";

const LOCALE_FLAG: Record<string, string> = { "pt-BR": "🇧🇷", "en-US": "🇺🇸" };

export function ResumePicker({
  resumes,
  value,
  onChange,
}: {
  resumes: ResumeRecord[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (resumes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
        Nenhuma versão de currículo encontrada. Crie uma na aba <b>Currículos</b>.
      </div>
    );
  }

  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
      {resumes.map((r) => {
        const active = value === r.id;
        return (
          <label
            key={r.id}
            htmlFor={`resume-pick-${r.id}`}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all",
              active ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/40 hover:border-primary/30"
            )}
          >
            <RadioGroupItem id={`resume-pick-${r.id}`} value={r.id} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">{r.name}</span>
                {r.isBase && (
                  <Badge className="bg-primary/10 text-primary border-none gap-1 text-[10px]">
                    <BadgeCheck className="h-3 w-3" /> Base
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {LOCALE_FLAG[r.locale] ?? "🌐"} {r.locale} · {r.template} · {r.data.hero.name || "sem identidade"}
              </p>
            </div>
          </label>
        );
      })}
    </RadioGroup>
  );
}
