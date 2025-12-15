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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, BookOpen, Dumbbell, Home, Coffee, Briefcase, Sun, Plus, Pencil, Trash2, Wand2, Loader2, LucideIcon, CheckCircle2, Sparkles } from "lucide-react";
import { seedRoutine, createRoutineItem, updateRoutineItem, deleteRoutineItem, resetRoutine } from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Tipagem e Configuração
type CategoryKey = 'health' | 'study' | 'work' | 'home' | 'leisure';

interface CategoryStyle {
    label: string;
    icon: LucideIcon;
    colorClass: string; // Classe Tailwind para texto/bg
}

const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
    health: { label: "Saúde", icon: Dumbbell, colorClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    study: { label: "Estudos", icon: BookOpen, colorClass: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    work: { label: "Trabalho", icon: Briefcase, colorClass: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
    home: { label: "Casa", icon: Home, colorClass: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
    leisure: { label: "Lazer", icon: Coffee, colorClass: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
};

const DAYS = [
    { id: 'mon', label: 'Segunda', short: 'Seg' },
    { id: 'tue', label: 'Terça', short: 'Ter' },
    { id: 'wed', label: 'Quarta', short: 'Qua' },
    { id: 'thu', label: 'Quinta', short: 'Qui' },
    { id: 'fri', label: 'Sexta', short: 'Sex' },
    { id: 'sat', label: 'Sábado', short: 'Sáb' },
    { id: 'sun', label: 'Domingo', short: 'Dom' }
];

export function RoutineManager({ items }: { items: RoutineItem[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Dia atual para aba inicial
    const currentDayIndex = new Date().getDay(); 
    const jsDayToId = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const defaultTab = jsDayToId[currentDayIndex];

    const handleSeed = async () => {
        setIsLoading(true);
        await seedRoutine();
        toast.success("Rotina padrão importada!");
        router.refresh();
        setIsLoading(false);
    }

    const handleReset = async () => {
        setIsLoading(true);
        await resetRoutine();
        toast.success("Rotina zerada.");
        router.refresh();
        setIsLoading(false);
    }

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Minha Rotina</h3>
                    <p className="text-sm text-muted-foreground">Hábitos e blocos de tempo recorrentes.</p>
                </div>
                <div className="flex gap-2">
                    {items.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Zerar Rotina Completa?</AlertDialogTitle>
                                    <AlertDialogDescription>Isso apagará todos os blocos de todos os dias. Ação irreversível.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">Zerar Tudo</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button size="sm" onClick={() => setIsDialogOpen(true)} className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Novo Bloco
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-border rounded-xl bg-muted/10">
                    <Wand2 className="h-10 w-10 text-primary mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium mb-4">Sua rotina está vazia.</p>
                    <Button onClick={handleSeed} disabled={isLoading} variant="outline">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                        Gerar Rotina Padrão
                    </Button>
                </div>
            ) : (
                <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0 w-full">
                    <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                        <TabsList className="bg-muted p-1 h-9 w-full justify-start min-w-max">
                            {DAYS.map(day => (
                                <TabsTrigger 
                                    key={day.id} 
                                    value={day.id}
                                    className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 h-7 text-xs"
                                >
                                    {day.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 bg-card border border-border rounded-lg mt-2 min-h-[400px] relative overflow-hidden">
                        {DAYS.map(day => (
                            <TabsContent key={day.id} value={day.id} className="h-full m-0 absolute inset-0">
                                <ScrollArea className="h-full p-4">
                                    <RoutineList items={items.filter(i => i.daysOfWeek.includes(day.id))} />
                                </ScrollArea>
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            )}

            {/* Modal de Criação */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Novo Bloco de Rotina</DialogTitle>
                        <DialogDescription>Defina uma atividade recorrente.</DialogDescription>
                    </DialogHeader>
                    <RoutineForm onClose={() => setIsDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Lista de Itens (Renderização)
function RoutineList({ items }: { items: RoutineItem[] }) {
    const sortedItems = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (sortedItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground opacity-60">
                <Sun className="h-10 w-10 mb-2 stroke-1" />
                <p className="text-sm">Dia livre!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 relative pl-4 pb-4">
             {/* Linha do Tempo Visual */}
             <div className="absolute left-[23px] top-4 bottom-4 w-px bg-border -z-10"></div>

            {sortedItems.map((item) => {
                const catKey = (item.category && CATEGORIES[item.category as CategoryKey]) ? (item.category as CategoryKey) : 'study';
                const style = CATEGORIES[catKey];
                const Icon = style.icon;

                return (
                    <EditRoutineDialog key={item.id} item={item}>
                        <div className="group flex items-start gap-4 cursor-pointer hover:translate-x-1 transition-transform duration-200">
                            
                            {/* Ícone na Linha do Tempo */}
                            <div className="flex flex-col items-center mt-1">
                                <div className={cn("p-2 rounded-full border z-10 bg-background shadow-sm transition-colors group-hover:border-primary/50", style.colorClass)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>

                            {/* Conteúdo do Card */}
                            <div className="flex-1 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-foreground">{item.title}</span>
                                    <Badge variant="outline" className="font-mono text-[10px] h-5 bg-muted/50 border-border text-muted-foreground">
                                        {item.startTime} - {item.endTime}
                                    </Badge>
                                </div>
                                {item.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                )}
                            </div>
                        </div>
                    </EditRoutineDialog>
                )
            })}
        </div>
    )
}

// Dialog de Edição (Wrapper)
function EditRoutineDialog({ item, children }: { item: RoutineItem, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Bloco</DialogTitle>
                    <DialogDescription>Atualize os detalhes desta atividade.</DialogDescription>
                </DialogHeader>
                <RoutineForm item={item} onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

// Formulário Unificado (Create/Edit)
function RoutineForm({ item, onClose }: { item?: RoutineItem, onClose: () => void }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>(
        item?.daysOfWeek ? item.daysOfWeek.split(',') : ['mon', 'tue', 'wed', 'thu', 'fri']
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const toggleDay = (dayId: string) => {
        if(selectedDays.includes(dayId)) setSelectedDays(selectedDays.filter(d => d !== dayId));
        else setSelectedDays([...selectedDays, dayId]);
    }

    const handleSubmit = async (formData: FormData) => {
        if (selectedDays.length === 0) {
            toast.error("Selecione pelo menos um dia da semana!");
            return;
        }
        setIsLoading(true);
        formData.append('daysOfWeek', selectedDays.join(','));
        
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
    }

    return (
        <form action={handleSubmit} className="space-y-6 pt-2">
            {item && <input type="hidden" name="id" value={item.id} />}
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Início</Label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="time" name="startTime" defaultValue={item?.startTime || "07:00"} className="pl-9 bg-muted/30 border-border" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Fim</Label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="time" name="endTime" defaultValue={item?.endTime || "08:00"} className="pl-9 bg-muted/30 border-border" required />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Atividade</Label>
                <Input name="title" defaultValue={item?.title} placeholder="Ex: Academia, Leitura, Trabalho Focado" className="bg-muted/30 border-border" required />
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Categoria</Label>
                <Select name="category" defaultValue={item?.category || "study"}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="health">Saúde / Treino</SelectItem>
                        <SelectItem value="study">Estudos</SelectItem>
                        <SelectItem value="work">Trabalho</SelectItem>
                        <SelectItem value="home">Casa</SelectItem>
                        <SelectItem value="leisure">Lazer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Repetir em</Label>
                <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                        <div 
                            key={day.id} 
                            onClick={(e) => { e.preventDefault(); toggleDay(day.id); }} 
                            className={cn(
                                "cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold border transition-all select-none",
                                selectedDays.includes(day.id) 
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                            )}
                        >
                            {day.short.substring(0, 1)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Notas (Opcional)</Label>
                <Textarea name="description" defaultValue={item?.description || ""} rows={2} className="bg-muted/30 border-border resize-none" placeholder="Detalhes extras..." />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-border flex sm:justify-between w-full">
                {item && (
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="icon" className="shrink-0" disabled={isLoading}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Bloco?</AlertDialogTitle>
                                <AlertDialogDescription>Este item será removido da sua rotina permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <div className="flex gap-2 w-full justify-end">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[100px]" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    )
}