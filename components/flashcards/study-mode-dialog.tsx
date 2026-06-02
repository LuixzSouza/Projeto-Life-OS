"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Zap, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { countDue, type DeckWithCount } from "./deck-grid-types";

interface StudyModeDialogProps {
  deck: DeckWithCount | null;
  onClose: () => void;
}

export function StudyModeDialog({ deck, onClose }: StudyModeDialogProps) {
  const due = deck ? countDue(deck.cards) : 0;
  const total = deck?.cards.length ?? 0;
  return (
    <Dialog open={!!deck} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-border/60 shadow-2xl rounded-2xl bg-background">

          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border-b border-border/40">
              <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-3 font-extrabold">
                      <div className="p-2.5 bg-background rounded-xl shadow-sm border border-border/50">
                          <BrainCircuit className="h-6 w-6 text-primary" />
                      </div>
                      Central de Aprendizado
                  </DialogTitle>
                  <DialogDescription className="text-base text-foreground/80 mt-2">
                      Você está prestes a iniciar os estudos de <strong className="text-foreground">{deck?.title}</strong>. Qual será a sua estratégia de hoje?
                  </DialogDescription>
              </DialogHeader>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">

              {/* Botão: Modo Prova */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=cram`}
                  className="group p-8 hover:bg-muted/30 transition-colors flex flex-col gap-3 focus:outline-none focus:bg-muted/50"
              >
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                          <Zap className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-xl text-foreground">Modo Prova</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      Ignora a curva de esquecimento e revisa <strong className="text-foreground">todos os {total} cartões</strong> de uma vez. Ideal para vésperas de avaliações.
                  </p>
              </Link>

              {/* Botão: Modo Memória */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=smart`}
                  className="group p-8 hover:bg-muted/30 transition-colors flex flex-col gap-3 relative overflow-hidden focus:outline-none focus:bg-muted/50"
              >
                  <div className="absolute top-0 right-0 px-3 py-1.5 bg-primary text-[10px] font-black tracking-widest uppercase text-primary-foreground rounded-bl-2xl shadow-md">
                      RECOMENDADO
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                          <GraduationCap className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-xl text-foreground">Modo Inteligente</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      Usa a <strong className="text-foreground">Repetição Espaçada</strong>. Foca apenas nos cartões que o seu cérebro está prestes a esquecer.
                  </p>
                  <span className={cn(
                      "mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold",
                      due > 0 ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                      {due > 0 ? `${due} para revisar hoje` : "Tudo em dia 🎉"}
                  </span>
              </Link>
          </div>

          <div className="p-5 bg-muted/10 border-t border-border/40 flex justify-end">
              <Button variant="outline" size="lg" className="rounded-xl font-bold h-12 px-8" onClick={onClose}>
                  Cancelar
              </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
