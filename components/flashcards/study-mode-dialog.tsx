"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Zap, GraduationCap, PenLine } from "lucide-react";
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
      <DialogContent size="lg">
          <DialogHeader
            icon={<BrainCircuit />}
            title="Central de aprendizado"
            description={<>Estudos de <strong className="text-foreground">{deck?.title}</strong>. Qual será a estratégia de hoje?</>}
          />

          <DialogBody className="p-0">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">

              {/* Botão: Modo Memória (recomendado) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=smart`}
                  className="group p-7 hover:bg-muted/30 transition-colors flex flex-col gap-3 relative overflow-hidden focus:outline-none focus:bg-muted/50"
              >
                  <div className="absolute top-0 right-0 px-3 py-1.5 bg-primary text-[10px] font-black tracking-widest uppercase text-primary-foreground rounded-bl-2xl shadow-md">
                      RECOMENDADO
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                          <GraduationCap className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-lg text-foreground">Inteligente</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Repetição espaçada</strong>: foca só nos cartões prestes a serem esquecidos.
                  </p>
                  <span className={cn(
                      "mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold",
                      due > 0 ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                      {due > 0 ? `${due} para revisar hoje` : "Tudo em dia 🎉"}
                  </span>
              </Link>

              {/* Botão: Modo Escrita (recall ativo) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=written`}
                  className="group p-7 hover:bg-muted/30 transition-colors flex flex-col gap-3 focus:outline-none focus:bg-muted/50"
              >
                  <div className="flex items-center gap-3 mb-1">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm">
                          <PenLine className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-lg text-foreground">Escrita</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Recall ativo</strong>: você digita a resposta antes de revelar. Fixa muito mais que só virar o cartão.
                  </p>
              </Link>

              {/* Botão: Modo Prova */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=cram`}
                  className="group p-7 hover:bg-muted/30 transition-colors flex flex-col gap-3 focus:outline-none focus:bg-muted/50"
              >
                  <div className="flex items-center gap-3 mb-1">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                          <Zap className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-lg text-foreground">Prova</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      Revisa <strong className="text-foreground">todos os {total} cartões</strong> de uma vez. Ideal para véspera de avaliação.
                  </p>
              </Link>
          </div>
          </DialogBody>

          <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
