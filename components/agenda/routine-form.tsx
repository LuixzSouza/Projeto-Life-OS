"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoutineItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Trash2, Loader2 } from "lucide-react";
import { createRoutineItem, updateRoutineItem, deleteRoutineItem } from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CATEGORIES, DAYS } from "./routine-config";

// --- FORMULÁRIO (CREATE/EDIT) ---
export function RoutineForm({ item, onClose }: { item?: RoutineItem; onClose: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(item?.daysOfWeek ? item.daysOfWeek.split(",") : ["mon", "tue", "wed", "thu", "fri"]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) setSelectedDays(selectedDays.filter((d) => d !== dayId));
    else setSelectedDays([...selectedDays, dayId]);
  };

  const handleSubmit = async (formData: FormData) => {
    if (selectedDays.length === 0) {
        toast.error("Selecione pelo menos um dia da semana.");
        return; // ✅ CORREÇÃO: Resolve o erro TypeScript do 'action' do form
    }

    setIsLoading(true);
    formData.append("daysOfWeek", selectedDays.join(","));

    try {
      if (item) {
        await updateRoutineItem(formData);
        toast.success("Protocolo atualizado.");
      } else {
        await createRoutineItem(formData);
        toast.success("Bloco adicionado.");
      }
      router.refresh();
      onClose();
    } catch {
      toast.error("Erro ao sincronizar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await deleteRoutineItem(item!.id);
    toast.success("Bloco removido.");
    router.refresh();
    setIsDeleteDialogOpen(false);
    onClose();
  };

  return (
    <form action={handleSubmit} className="flex flex-col h-full overflow-hidden">

      {/* CORPO ROLÁVEL DO FORMULÁRIO */}
      <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
        {item && <input type="hidden" name="id" value={item.id} />}

        {/* Atividade */}
        <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Identificação da Atividade</Label>
            <Input name="title" defaultValue={item?.title} placeholder="Ex: Leitura Focada, Academia..." className="h-12 bg-muted/20 border-border/40 focus-visible:ring-primary/30 rounded-xl font-bold text-base" required />
        </div>

        {/* Time Grid (Início e Fim) */}
        <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 rounded-[1.5rem] border border-border/40 shadow-inner">
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Início
                </Label>
                <Input type="time" name="startTime" defaultValue={item?.startTime || "07:00"} className="h-12 bg-background border-border/40 focus-visible:ring-primary/30 rounded-xl font-mono font-black text-lg text-center" required />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Fim
                </Label>
                <Input type="time" name="endTime" defaultValue={item?.endTime || "08:00"} className="h-12 bg-background border-border/40 focus-visible:ring-primary/30 rounded-xl font-mono font-black text-lg text-center" required />
            </div>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categoria Tática</Label>
            <Select name="category" defaultValue={item?.category || "study"}>
            <SelectTrigger className="h-12 bg-muted/20 border-border/40 rounded-xl font-bold text-sm">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key} className={cn("font-bold", cat.colorClass)}>
                        {cat.label}
                    </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>

        {/* Dias da Semana (Chips) */}
        <div className="space-y-3">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Frequência (Ativo em)</Label>
            <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
                <div
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={cn(
                    "cursor-pointer h-10 px-4 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all select-none border-2",
                    selectedDays.includes(day.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:border-primary/30"
                )}
                >
                {day.short}
                </div>
            ))}
            </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2 pb-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Anotações Adicionais</Label>
            <Textarea name="description" defaultValue={item?.description || ""} rows={3} className="bg-muted/20 border-border/40 rounded-xl resize-none text-sm font-medium p-4 leading-relaxed" placeholder="Metas ou checklists da rotina..." />
        </div>
      </div>

      {/* RODAPÉ FIXO DO MODAL */}
      <div className="p-6 pt-4 bg-background border-t border-border/40 flex items-center justify-between gap-3 shrink-0">

        {item ? (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="h-12 w-12 p-0 rounded-xl text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shrink-0">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-border/40 shadow-2xl p-8 max-w-sm fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110]">
              <AlertDialogHeader className="items-center text-center">
                <div className="h-14 w-14 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-2xl mb-4"><Trash2 className="h-6 w-6"/></div>
                <AlertDialogTitle className="font-black uppercase tracking-tighter text-xl">Apagar Bloco?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs font-medium">Isso removerá a atividade da sua rotina.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2 sm:justify-center">
                <AlertDialogCancel className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest m-0 flex-1">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white h-11 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
            <div />
        )}

        <div className="flex gap-2 flex-1 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hidden sm:flex">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="h-12 w-full sm:w-auto px-8 rounded-xl bg-foreground text-background hover:bg-primary hover:text-white shadow-lg font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gravar Dados"}
          </Button>
        </div>
      </div>
    </form>
  );
}
