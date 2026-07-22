"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Zap, GraduationCap, PenLine, Sparkles, ClipboardCheck } from "lucide-react";
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
          <div className="divide-y divide-border/50">

              {/* Botão: Modo Memória (recomendado) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=smart`}
                  className="group flex items-start gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
              >
                  <div className="shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                      <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg text-foreground">Inteligente</h3>
                          <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[10px] font-black tracking-widest uppercase text-primary-foreground">
                              Recomendado
                          </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Repetição espaçada</strong>: foca só nos cartões prestes a serem esquecidos.
                      </p>
                      <span className={cn(
                          "mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold",
                          due > 0 ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                          {due > 0 ? `${due} para revisar hoje` : "Tudo em dia 🎉"}
                      </span>
                  </div>
              </Link>

              {/* Botão: Modo Escrita (recall ativo) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=written`}
                  className="group flex items-start gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
              >
                  <div className="shrink-0 p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm">
                      <PenLine className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-foreground">Escrita</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Recall ativo</strong>: você digita a resposta antes de revelar. Fixa muito mais que só virar o cartão.
                      </p>
                  </div>
              </Link>

              {/* Botão: Modo Prova */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=cram`}
                  className="group flex items-start gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
              >
                  <div className="shrink-0 p-2.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                      <Zap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-foreground">Prova</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          Revisa <strong className="text-foreground">todos os {total} cartões</strong> de uma vez. Ideal para véspera de avaliação.
                      </p>
                  </div>
              </Link>

              {/* Botão: Modo Teste (múltipla escolha) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=test`}
                  className="group flex items-start gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
              >
                  <div className="shrink-0 p-2.5 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                      <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-foreground">Teste</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Múltipla escolha</strong> gerada dos cartões, com nota no fim. Simula a prova{total < 2 ? " (precisa de 2+ cartões)" : ""}.
                      </p>
                  </div>
              </Link>

              {/* Botão: Modo Combinar (jogo) */}
              <Link
                  href={`/flashcards/${deck?.id}/study?mode=match`}
                  className="group flex items-start gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
              >
                  <div className="shrink-0 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                      <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg text-foreground">Combinar</h3>
                          <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Jogo</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          Ligue <strong className="text-foreground">termo ↔ definição</strong> contra o relógio. Prática rápida e divertida{total < 2 ? " (precisa de 2+ cartões)" : ""}.
                      </p>
                  </div>
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
