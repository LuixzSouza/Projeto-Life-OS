"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoutineItem } from "@prisma/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Wand2, Loader2, Sparkles,
  LayoutGrid, CalendarDays, MoreVertical, BrushCleaning,
} from "lucide-react";
import { seedRoutine, resetRoutine } from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DAYS } from "./routine-config";
import { RoutineGrid } from "./routine-grid";
import { RoutineForm } from "./routine-form";
import { CleaningRotationDialog } from "./cleaning-rotation-dialog";

// --- COMPONENTE PRINCIPAL ---
export function RoutineManager({ items }: { items: RoutineItem[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCleaningOpen, setIsCleaningOpen] = useState(false);

  const currentDayIndex = new Date().getDay();
  const jsDayToId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const defaultTab = jsDayToId[currentDayIndex];

  const countByDay = (id: string) => items.filter((i) => i.daysOfWeek.includes(id)).length;

  const handleSeed = async () => {
    setIsLoading(true);
    await seedRoutine();
    toast.success("Rotina padrão importada com sucesso!");
    router.refresh();
    setIsLoading(false);
  };

  const handleReset = async () => {
    setIsLoading(true);
    await resetRoutine();
    toast.success("Rotina apagada do sistema.");
    router.refresh();
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[700px] w-full animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">Protocolo Base</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Hábitos e blocos de tempo fixos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl hover:bg-muted border-border/60">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer font-bold text-xs uppercase tracking-widest gap-2">
                      <Trash2 className="h-4 w-4" /> Resetar Tudo
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2.5rem] p-8 border-border/40 max-w-sm text-center">
                    <AlertDialogHeader className="flex flex-col items-center">
                      <div className="h-14 w-14 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-2xl mb-4"><Trash2 className="h-6 w-6"/></div>
                      <AlertDialogTitle className="font-black uppercase tracking-tighter text-xl">Zerar Rotina?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs font-medium">Isso apagará todos os blocos de todos os dias da semana. Irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center mt-6">
                      <AlertDialogCancel className="rounded-xl text-[10px] font-black uppercase tracking-widest h-12 w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 w-full sm:w-auto">Confirmar Exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            onClick={() => setIsCleaningOpen(true)}
            variant="outline"
            className="h-11 px-4 rounded-xl gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-black uppercase tracking-widest text-[10px] shadow-sm transition-all"
            title="Limpeza Programada: rodízio de cômodos por dia"
          >
            <BrushCleaning className="h-4 w-4" /> Limpeza
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="h-11 px-5 rounded-xl bg-foreground text-background hover:bg-primary shadow-lg font-black uppercase tracking-widest text-[10px] gap-2 transition-all">
            <Plus className="h-4 w-4 stroke-[3]" /> Novo Bloco
          </Button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5 mt-6">
          <div className="bg-primary/10 p-4 rounded-2xl mb-6 shadow-inner border border-primary/20">
            <Wand2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h4 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">Protocolo Vazio</h4>
          <p className="text-muted-foreground text-xs font-medium text-center max-w-[300px] mb-8 leading-relaxed">
            Você ainda não configurou uma rotina fixa. Use o nosso modelo de alta performance para começar.
          </p>
          <Button onClick={handleSeed} disabled={isLoading} variant="outline" className="h-12 px-6 rounded-xl gap-2 border-primary/30 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] shadow-sm transition-all">
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            Gerar Rotina Padrão
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0 w-full mt-6">
          {/* TABS DE NAVEGAÇÃO DE DIAS */}
          <ScrollArea className="w-full shrink-0">
            <TabsList className="bg-transparent p-0 h-auto gap-2 w-full justify-start pb-2">
              {DAYS.map((day) => {
                const count = countByDay(day.id);
                const isToday = day.id === defaultTab;
                return (
                  <TabsTrigger
                    key={day.id}
                    value={day.id}
                    className={cn(
                      "group/tab relative flex items-center gap-1.5 border border-border/40 rounded-xl px-4 h-11 text-[11px] font-black uppercase tracking-widest transition-all hover:bg-muted bg-background shadow-sm",
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
                      isToday && "ring-1 ring-primary/50",
                    )}
                  >
                    {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary group-data-[state=active]/tab:bg-primary-foreground" />}
                    {day.label}
                    {count > 0 && (
                      <span className="rounded-md bg-foreground/10 px-1.5 text-[9px] tabular-nums leading-5 group-data-[state=active]/tab:bg-background/25">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {/* GRID DE HORÁRIOS */}
          <div className="flex-1 bg-card border border-border/40 rounded-[2rem] shadow-sm relative overflow-hidden mt-4">
            {DAYS.map((day) => (
              <TabsContent key={day.id} value={day.id} className="h-full m-0 absolute inset-0 outline-none">
                <RoutineGrid items={items.filter((i) => i.daysOfWeek.includes(day.id))} isToday={day.id === defaultTab} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}

      {/* MODAL DE CRIAÇÃO (NOVO DESIGN) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] p-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100] overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Novo Bloco Fixo</DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Configure um hábito recorrente</DialogDescription>
              </div>
            </div>
          </div>
          <RoutineForm onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* LIMPEZA PROGRAMADA (rodízio de cômodos → blocos fixos) */}
      <CleaningRotationDialog open={isCleaningOpen} onClose={() => setIsCleaningOpen(false)} />
    </div>
  );
}
