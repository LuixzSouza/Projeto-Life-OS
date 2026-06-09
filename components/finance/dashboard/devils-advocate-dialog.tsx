"use client";

// Advogado do Diabo (#17): botão que aparece quando um balde estoura.
// Abre o "tribunal": o sistema usa as metas/escritos do próprio usuário
// para confrontar o estouro. IA quando configurada; matemática local sempre.

import { useState, useTransition } from "react";
import { Flame, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  getDevilsAdvocate, type AdvocateInput, type AdvocateVerdict,
} from "@/app/(dashboard)/finance/devils-advocate-actions";

export function DevilsAdvocateButton({ input }: { input: AdvocateInput }) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<AdvocateVerdict | null>(null);
  const [pending, start] = useTransition();

  const summon = () => {
    setOpen(true);
    if (verdict || pending) return;
    start(async () => {
      setVerdict(await getDevilsAdvocate(input));
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={summon}
        className="w-full rounded-xl gap-1.5 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
      >
        <Scale className="h-3.5 w-3.5" /> Ouvir o Advogado do Diabo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" /> Advogado do Diabo
            </DialogTitle>
            <DialogDescription>
              Não sou eu falando — são os seus próprios argumentos.
            </DialogDescription>
          </DialogHeader>

          {pending || !verdict ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reunindo o que você mesmo disse…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="whitespace-pre-line rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm leading-relaxed text-foreground">
                {verdict.text}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {verdict.source === "ai"
                  ? "Redigido pela sua IA configurada, com base nas suas metas e notas."
                  : "Gerado localmente com a matemática das suas metas (configure a IA em Configurações → IA para um confronto mais afiado)."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
