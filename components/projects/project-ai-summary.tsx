"use client";

// Botão "Resumo IA" do board do projeto: o que falta, riscos e a próxima ação.
// One-shot barato (sem tools) — o snapshot do projeto vai inteiro no prompt.

import { useState, useTransition } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateProjectAiSummary } from "@/app/(dashboard)/projects/actions/ai-summary";

/** Render leve do markdown do resumo (negrito + bullets — sem dependências). */
function SummaryText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isBullet = /^[-*•]\s/.test(trimmed);
        const content = trimmed.replace(/^[-*•]\s/, "");
        const parts = content.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className={isBullet ? "pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-primary" : ""}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : <span key={j}>{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

export function ProjectAiSummary({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const result = await generateProjectAiSummary(projectId);
      if (result.error || !result.text) {
        toast.error(result.error ?? "Falha ao gerar o resumo.");
        return;
      }
      setSummary(result.text);
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 rounded-xl border-border/40 gap-1.5 text-xs font-semibold"
        onClick={() => {
          setOpen(true);
          if (!summary) generate();
        }}
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Resumo IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Resumo do projeto
            </DialogTitle>
            <DialogDescription className="truncate">{projectTitle}</DialogDescription>
          </DialogHeader>

          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando o board…
            </div>
          ) : summary ? (
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border/40 bg-muted/20 p-4 text-muted-foreground">
              <SummaryText text={summary} />
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sem resumo ainda — gere o primeiro.
            </p>
          )}

          <Button variant="outline" size="sm" className="gap-1.5 self-end" onClick={generate} disabled={isPending}>
            <RefreshCw className="h-3.5 w-3.5" /> Gerar de novo
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
