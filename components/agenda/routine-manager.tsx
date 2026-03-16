"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RoutineItem } from "@prisma/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
  Clock, BookOpen, Dumbbell, Home, Coffee, Briefcase, 
  Sun, Plus, Trash2, Wand2, Loader2, LucideIcon, Sparkles, 
  LayoutGrid, CalendarDays, MoreVertical, Edit2
} from "lucide-react";
import {
  seedRoutine, createRoutineItem, updateRoutineItem, 
  deleteRoutineItem, resetRoutine,
} from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- TIPAGEM E CONFIGURAÇÃO ---
type CategoryKey = "health" | "study" | "work" | "home" | "leisure";

interface CategoryStyle {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
  health: { label: "Saúde", icon: Dumbbell, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" },
  study: { label: "Estudos", icon: BookOpen, colorClass: "text-blue-500", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" },
  work: { label: "Trabalho", icon: Briefcase, colorClass: "text-violet-500", bgClass: "bg-violet-500/10", borderClass: "border-violet-500/20" },
  home: { label: "Casa", icon: Home, colorClass: "text-amber-500", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20" },
  leisure: { label: "Lazer", icon: Coffee, colorClass: "text-pink-500", bgClass: "bg-pink-500/10", borderClass: "border-pink-500/20" },
};

const DAYS = [
  { id: "mon", label: "Segunda", short: "Seg" },
  { id: "tue", label: "Terça", short: "Ter" },
  { id: "wed", label: "Quarta", short: "Qua" },
  { id: "thu", label: "Quinta", short: "Qui" },
  { id: "fri", label: "Sexta", short: "Sex" },
  { id: "sat", label: "Sábado", short: "Sáb" },
  { id: "sun", label: "Domingo", short: "Dom" },
];

// --- COMPONENTE PRINCIPAL ---
export function RoutineManager({ items }: { items: RoutineItem[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentDayIndex = new Date().getDay();
  const jsDayToId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const defaultTab = jsDayToId[currentDayIndex];

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
              {DAYS.map((day) => (
                <TabsTrigger
                  key={day.id}
                  value={day.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md border border-border/40 rounded-xl px-5 h-11 text-[11px] font-black uppercase tracking-widest transition-all hover:bg-muted bg-background shadow-sm"
                >
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {/* GRID DE HORÁRIOS */}
          <div className="flex-1 bg-card border border-border/40 rounded-[2rem] shadow-sm relative overflow-hidden mt-4">
            {DAYS.map((day) => (
              <TabsContent key={day.id} value={day.id} className="h-full m-0 absolute inset-0 outline-none">
                <RoutineGrid items={items.filter((i) => i.daysOfWeek.includes(day.id))} />
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
    </div>
  );
}

// --- SUBCOMPONENTE: ROUTINE GRID (TIMEBLOCKING) ---
const START_HOUR = 5; // 05:00
const END_HOUR = 23;  // 23:00
const HOUR_HEIGHT = 80;

function RoutineGrid({ items }: { items: RoutineItem[] }) {
  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) h.push(i);
    return h;
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground/40 text-center">
        <Sun className="h-16 w-16 mb-4 opacity-50" />
        <h4 className="text-xl font-black uppercase tracking-tighter text-foreground/50">Dia Livre</h4>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Nenhum protocolo para hoje</p>
      </div>
    );
  }

  const getStyle = (start: string, end: string) => {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    
    const startMins = (sH - START_HOUR) * 60 + sM;
    const durationMins = (eH * 60 + eM) - (sH * 60 + sM);
    
    return {
      top: `${(startMins / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((durationMins / 60) * HOUR_HEIGHT, 40)}px` 
    };
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar p-4">
      <div className="relative w-full" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
        
        {/* Background Régua */}
        {hours.map((hour) => (
          <div key={hour} className="absolute w-full flex items-start" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
            <div className="w-14 text-right pr-3 shrink-0 -mt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{hour.toString().padStart(2, '0')}:00</span>
            </div>
            <div className="flex-1 border-t border-border/40 border-dashed" />
          </div>
        ))}

        {/* Blocos de Rotina */}
        <div className="absolute left-14 right-2 top-0 bottom-0">
          {items.map((item) => {
            const styleProps = getStyle(item.startTime, item.endTime);
            const catKey = item.category && CATEGORIES[item.category as CategoryKey] ? (item.category as CategoryKey) : "study";
            const theme = CATEGORIES[catKey];
            const Icon = theme.icon;
            const isCompact = parseFloat(styleProps.height) <= 50;

            return (
              <EditRoutineDialog key={item.id} item={item}>
                <div 
                  className={cn(
                    "absolute left-2 right-2 rounded-xl border p-2.5 shadow-sm transition-all hover:shadow-lg hover:z-10 group cursor-pointer overflow-hidden",
                    theme.bgClass, theme.borderClass
                  )}
                  style={styleProps}
                >
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2", theme.bgClass.replace("/10", "/50"))} />
                  
                  <div className="flex justify-between items-start h-full pl-2">
                    <div className="flex flex-col min-w-0 h-full">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3 w-3 shrink-0", theme.colorClass)} />
                        <h4 className="font-bold text-xs truncate text-foreground leading-tight">{item.title}</h4>
                      </div>
                      
                      {!isCompact && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider", theme.colorClass)}>{theme.label}</span>
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums border-l border-border pl-2">
                            {item.startTime} - {item.endTime}
                          </span>
                        </div>
                      )}
                      
                      {!isCompact && item.description && (
                        <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1.5 font-medium">{item.description}</p>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 rounded-md p-1 backdrop-blur-sm">
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </EditRoutineDialog>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTE: DIALOG DE EDIÇÃO ---
function EditRoutineDialog({ item, children }: { item: RoutineItem; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] p-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Editar Bloco</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Ajuste os parâmetros da rotina</DialogDescription>
            </div>
          </div>
        </div>
        {/* O Form gerencia seu próprio scroll interno */}
        <RoutineForm item={item} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// --- SUBCOMPONENTE: FORMULÁRIO (CREATE/EDIT) COM LAYOUT MELHORADO ---
function RoutineForm({ item, onClose }: { item?: RoutineItem; onClose: () => void }) {
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