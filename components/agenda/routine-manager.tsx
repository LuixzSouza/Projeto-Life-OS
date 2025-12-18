"use client";

import { useState } from "react";
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
  DialogFooter,
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
  Clock,
  BookOpen,
  Dumbbell,
  Home,
  Coffee,
  Briefcase,
  Sun,
  Plus,
  Trash2,
  Wand2,
  Loader2,
  LucideIcon,
  Sparkles,
  LayoutGrid,
  CalendarDays,
  MoreVertical,
} from "lucide-react";
import {
  seedRoutine,
  createRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  resetRoutine,
} from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipagem e Configuração
type CategoryKey = "health" | "study" | "work" | "home" | "leisure";

interface CategoryStyle {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
  health: {
    label: "Saúde",
    icon: Dumbbell,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  study: {
    label: "Estudos",
    icon: BookOpen,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
  },
  work: {
    label: "Trabalho",
    icon: Briefcase,
    colorClass: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20",
  },
  home: {
    label: "Casa",
    icon: Home,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
  },
  leisure: {
    label: "Lazer",
    icon: Coffee,
    colorClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20",
  },
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

export function RoutineManager({ items }: { items: RoutineItem[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dia atual para aba inicial
  const currentDayIndex = new Date().getDay();
  const jsDayToId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const defaultTab = jsDayToId[currentDayIndex];

  const handleSeed = async () => {
    setIsLoading(true);
    await seedRoutine();
    toast.success("Rotina padrão importada!");
    router.refresh();
    setIsLoading(false);
  };

  const handleReset = async () => {
    setIsLoading(true);
    await resetRoutine();
    toast.success("Rotina zerada.");
    router.refresh();
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-6">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Minha Rotina
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus hábitos e blocos de tempo recorrentes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Zerar Rotina
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Zerar Rotina Completa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso apagará todos os blocos de todos os dias. Esta ação
                        é irreversível.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReset}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Confirmar Exclusão"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-9 gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo Bloco
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border/60 rounded-xl bg-muted/5 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-primary/10 p-4 rounded-full mb-4 ring-1 ring-primary/20">
            <Wand2 className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold text-foreground mb-1">
            Rotina Vazia
          </h4>
          <p className="text-muted-foreground text-sm text-center max-w-[280px] mb-6 leading-relaxed">
            Você ainda não configurou sua rotina. Comece do zero ou use nosso modelo sugerido.
          </p>
          <Button
            onClick={handleSeed}
            disabled={isLoading}
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar Rotina Padrão
          </Button>
        </div>
      ) : (
        <Tabs
          defaultValue={defaultTab}
          className="flex-1 flex flex-col min-h-0 w-full gap-4"
        >
          <ScrollArea className="w-full pb-2">
            <TabsList className="bg-transparent p-0 h-auto gap-2 w-full justify-start">
              {DAYS.map((day) => (
                <TabsTrigger
                  key={day.id}
                  value={day.id}
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-muted"
                >
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          <div className="flex-1 bg-card border border-border/60 rounded-xl shadow-sm relative overflow-hidden min-h-[400px]">
            {DAYS.map((day) => (
              <TabsContent
                key={day.id}
                value={day.id}
                className="h-full m-0 absolute inset-0 outline-none"
              >
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <RoutineList
                      items={items.filter((i) =>
                        i.daysOfWeek.includes(day.id)
                      )}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}

      {/* Modal de Criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Novo Bloco de Rotina</DialogTitle>
                <DialogDescription className="mt-1">
                  Defina uma atividade recorrente para sua semana.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 pt-2">
            <RoutineForm onClose={() => setIsDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Lista de Itens (Renderização)
function RoutineList({ items }: { items: RoutineItem[] }) {
  const sortedItems = [...items].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  if (sortedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground/50">
        <Sun className="h-12 w-12 mb-3 stroke-[1.5] opacity-50" />
        <p className="text-base font-medium">Dia livre!</p>
        <p className="text-xs">Nenhuma atividade planejada para hoje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pl-4">
      {/* Linha do Tempo Visual */}
      <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border/60 -z-10 border-l border-dashed" />

      {sortedItems.map((item) => {
        const catKey =
          item.category && CATEGORIES[item.category as CategoryKey]
            ? (item.category as CategoryKey)
            : "study";
        const style = CATEGORIES[catKey];
        const Icon = style.icon;

        return (
          <EditRoutineDialog key={item.id} item={item}>
            <div className="group flex items-start gap-4 cursor-pointer">
              {/* Ícone na Linha do Tempo */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className={cn(
                    "p-2.5 rounded-xl border z-10 bg-card shadow-sm transition-all group-hover:scale-110 group-hover:shadow-md",
                    style.colorClass,
                    style.borderClass
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div
                className={cn(
                  "flex-1 p-4 rounded-xl border bg-card transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-md hover:translate-x-1",
                  "flex flex-col gap-2 relative overflow-hidden"
                )}
              >
                {/* Indicador lateral de categoria */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                    style.bgClass.replace("/10", "/40")
                  )}
                />

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-tight">
                      {item.title}
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mt-1 block">
                      {style.label}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] h-6 px-2 bg-muted/50 border border-border/50 text-foreground"
                  >
                    <Clock className="h-3 w-3 mr-1.5 opacity-50" />
                    {item.startTime} - {item.endTime}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-2 border-l-2 border-border/40 ml-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </EditRoutineDialog>
        );
      })}
    </div>
  );
}

// Dialog de Edição (Wrapper)
function EditRoutineDialog({
  item,
  children,
}: {
  item: RoutineItem;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2 bg-muted/10 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Editar Bloco</DialogTitle>
              <DialogDescription className="mt-1">
                Atualize os detalhes desta atividade.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6">
          <RoutineForm item={item} onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Formulário Unificado (Create/Edit)
function RoutineForm({
  item,
  onClose,
}: {
  item?: RoutineItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    item?.daysOfWeek
      ? item.daysOfWeek.split(",")
      : ["mon", "tue", "wed", "thu", "fri"]
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId))
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    else setSelectedDays([...selectedDays, dayId]);
  };

  const handleSubmit = async (formData: FormData) => {
    if (selectedDays.length === 0) {
      toast.error("Selecione pelo menos um dia da semana!");
      return;
    }
    setIsLoading(true);
    formData.append("daysOfWeek", selectedDays.join(","));

    try {
      if (item) {
        await updateRoutineItem(formData);
        toast.success("Rotina atualizada!");
      } else {
        await createRoutineItem(formData);
        toast.success("Bloco criado!");
      }
      router.refresh();
      onClose();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await deleteRoutineItem(item!.id);
    toast.success("Removido da rotina.");
    router.refresh();
    setIsLoading(false);
    setIsDeleteDialogOpen(false);
    onClose();
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Início
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              name="startTime"
              defaultValue={item?.startTime || "07:00"}
              className="pl-9 bg-muted/20 border-border h-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Fim
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              name="endTime"
              defaultValue={item?.endTime || "08:00"}
              className="pl-9 bg-muted/20 border-border h-10"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Atividade
        </Label>
        <Input
          name="title"
          defaultValue={item?.title}
          placeholder="Ex: Academia, Leitura, Trabalho Focado"
          className="bg-muted/20 border-border h-10 font-medium"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Categoria
        </Label>
        <Select name="category" defaultValue={item?.category || "study"}>
          <SelectTrigger className="bg-muted/20 border-border h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="health">Saúde / Treino</SelectItem>
            <SelectItem value="study">Estudos</SelectItem>
            <SelectItem value="work">Trabalho</SelectItem>
            <SelectItem value="home">Casa</SelectItem>
            <SelectItem value="leisure">Lazer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 p-4 bg-muted/10 rounded-xl border border-border/40">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
          Repetir em
        </Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <div
              key={day.id}
              onClick={(e) => {
                e.preventDefault();
                toggleDay(day.id);
              }}
              className={cn(
                "cursor-pointer h-9 px-3 flex items-center justify-center rounded-lg text-xs font-bold border transition-all select-none",
                selectedDays.includes(day.id)
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {day.short}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Notas (Opcional)
        </Label>
        <Textarea
          name="description"
          defaultValue={item?.description || ""}
          rows={2}
          className="bg-muted/20 border-border resize-none"
          placeholder="Detalhes extras..."
        />
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-border/40 mt-4">
        {item ? (
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 -ml-2"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Bloco?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este item será removido da sua rotina permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px] shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}