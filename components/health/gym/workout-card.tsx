"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Timer, Flame, Pencil, Trash2, StickyNote, Repeat2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteWorkout } from "@/app/(dashboard)/health/actions";
import { GymForm } from "./gym-form";
import { startOptionsFromWorkout } from "./workout-detail";
import { savePendingStart } from "./session/session-storage";
import type { GymWorkout } from "./gym-types";

interface WorkoutCardProps {
  workout: GymWorkout;
  /** Abre o detalhe completo (modal único do dashboard). */
  onOpenDetail?: () => void;
}

export function WorkoutCard({ workout: w, onOpenDetail }: WorkoutCardProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    const res = await deleteWorkout(w.id);
    if (res.success) { toast.success("Treino removido."); router.refresh(); }
    else toast.error(res.message);
  };

  // Repetir: inicia uma sessão ao vivo com os mesmos exercícios (pending-start).
  const handleRepeat = () => {
    savePendingStart(startOptionsFromWorkout(w));
    router.push("/health/gym/session");
  };

  return (
    <Card
      onClick={onOpenDetail}
      className={cn(
        "group overflow-hidden border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200",
        onOpenDetail && "cursor-pointer",
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Header e Badges (Esquerda) */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                {/* Título é um botão de verdade (teclado/leitor de tela abrem o detalhe;
                    o clique no card é atalho de mouse — sem role=button com filhos). */}
                {onOpenDetail ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
                    className="block max-w-full truncate text-left font-semibold text-base text-foreground hover:text-primary transition-colors"
                    title="Ver treino completo"
                  >
                    {w.title}
                  </button>
                ) : (
                  <h3 className="font-semibold text-base text-foreground truncate">{w.title}</h3>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(w.date), "dd MMM, HH:mm", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    {w.duration} min
                  </span>
                </div>
              </div>

              {/* Ações (repetir / editar / excluir) */}
              <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); handleRepeat(); }} title="Repetir este treino" aria-label="Repetir este treino">
                  <Repeat2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setIsEditOpen(true); }} title="Editar" aria-label="Editar treino">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()} title="Excluir" aria-label="Excluir treino">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover treino?</AlertDialogTitle>
                      <AlertDialogDescription>O registro &quot;{w.title}&quot; será apagado permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Labels / Sentimento */}
            <div className="flex flex-wrap items-center gap-2">
              {w.feeling && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                  w.feeling === 'TIRED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    w.feeling === 'HARD' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                )}>
                  <Flame className="h-3 w-3" />
                  {w.feeling === 'GOOD' ? 'Bom Desempenho' : w.feeling === 'TIRED' ? 'Cansativo' : w.feeling === 'HARD' ? 'Intenso' : w.feeling}
                </span>
              )}
              {(w.muscleGroup || "").split(", ").filter(Boolean).map((mg, i) => (
                <span key={i} className="px-2 py-0.5 bg-muted/50 border border-border/50 rounded-md text-[10px] font-medium text-muted-foreground">
                  {mg}
                </span>
              ))}
            </div>
          </div>

          {/* Lista de Exercícios (Direita) */}
          <div className="w-full lg:w-[380px] bg-muted/10 rounded-xl border border-border/40 p-3">
            <div className="space-y-1.5">
              {w.exercises.slice(0, 4).map((ex, i) => (
                <div key={i} className="rounded p-1.5 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-foreground/80 truncate pr-2">{ex.name || "—"}</span>
                    <div className="flex items-center gap-2 text-muted-foreground font-mono shrink-0">
                      <span>{ex.sets}x{ex.reps}</span>
                      {ex.weight && ex.weight !== "0" && (
                        <span className="bg-background border border-border/50 px-1.5 rounded text-foreground font-semibold">{ex.weight}kg</span>
                      )}
                    </div>
                  </div>
                  {ex.note && (
                    <p className="mt-1 flex items-start gap-1 text-[10px] italic leading-snug text-muted-foreground/80">
                      <StickyNote className="mt-px h-2.5 w-2.5 shrink-0 text-amber-500" />
                      <span className="line-clamp-2">{ex.note}</span>
                    </p>
                  )}
                </div>
              ))}
              {w.exercises.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">Sem exercícios registrados.</p>}
              {w.exercises.length > 4 && (
                <p className="text-[10px] text-center text-muted-foreground pt-1">+{w.exercises.length - 4} outros exercícios</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Modal de edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-border/40 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl">Editar treino</DialogTitle>
            <DialogDescription>Ajuste as cargas, músculos e exercícios da sessão.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <GymForm
              initialData={{
                id: w.id,
                title: w.title,
                duration: w.duration,
                muscleGroup: w.muscleGroup,
                exercises: JSON.stringify(w.exercises),
              }}
              onSuccess={() => { setIsEditOpen(false); router.refresh(); }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
