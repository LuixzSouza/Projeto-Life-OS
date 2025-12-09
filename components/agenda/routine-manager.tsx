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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, BookOpen, Dumbbell, Home, Coffee, Briefcase, Sun, Plus, Pencil, Trash2, Wand2, Loader2, LucideIcon } from "lucide-react";
import { seedRoutine, createRoutineItem, updateRoutineItem, deleteRoutineItem, resetRoutine } from "@/app/(dashboard)/agenda/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 1. Tipagem e Configuração
type CategoryKey = 'health' | 'study' | 'work' | 'home' | 'leisure';

interface CategoryStyle {
    label: string;
    icon: LucideIcon;
    color: string;
}

const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
    health: { label: "Saúde", icon: Dumbbell, color: "text-green-600 bg-green-50 border-green-200" },
    study: { label: "Estudos", icon: BookOpen, color: "text-blue-600 bg-blue-50 border-blue-200" },
    work: { label: "Trabalho", icon: Briefcase, color: "text-purple-600 bg-purple-50 border-purple-200" },
    home: { label: "Casa", icon: Home, color: "text-orange-600 bg-orange-50 border-orange-200" },
    leisure: { label: "Lazer", icon: Coffee, color: "text-pink-600 bg-pink-50 border-pink-200" },
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
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    // Dia da semana atual para abrir a aba certa (0 = Dom, 1 = Seg...)
    const currentDayIndex = new Date().getDay();
    // Mapeia index do JS (0=Dom) para nossos IDs
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
        setIsResetDialogOpen(false);
    }

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Minha Rotina</h3>
                    <p className="text-sm text-zinc-500">Planejamento diário.</p>
                </div>
                <div className="flex gap-2">
                    {items.length > 0 && (
                        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Apagar tudo">
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Zerar Rotina Completa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Isso apagará todos os blocos de todos os dias. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700">
                                        Sim, Zerar Tudo
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Novo Bloco
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-xl bg-zinc-50/50">
                    <Wand2 className="h-10 w-10 text-indigo-400 mb-4" />
                    <p className="text-zinc-600 font-medium">Sua rotina está vazia.</p>
                    <Button onClick={handleSeed} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Importar Rotina Pronta
                    </Button>
                </div>
            ) : (
                <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0 w-full">
                    {/* Lista de Abas com Scroll Horizontal para caber todos os dias */}
                    <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                        <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-2 min-w-max">
                            {DAYS.map(day => (
                                <TabsTrigger 
                                    key={day.id} 
                                    value={day.id}
                                    className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:border-indigo-200 border border-transparent px-4 rounded-md text-zinc-500"
                                >
                                    {day.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 border rounded-lg bg-white/50 dark:bg-zinc-900/50 min-h-[400px] relative overflow-hidden">
                        {DAYS.map(day => {
                            // Filtra itens para este dia específico
                            const dayItems = items.filter(i => i.daysOfWeek.includes(day.id));
                            return (
                                <TabsContent key={day.id} value={day.id} className="h-full m-0 absolute inset-0">
                                    <ScrollArea className="h-full p-4">
                                        <RoutineList items={dayItems} />
                                    </ScrollArea>
                                </TabsContent>
                            )
                        })}
                    </div>
                </Tabs>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar à Rotina</DialogTitle>
                    </DialogHeader>
                    <RoutineForm onClose={() => setIsDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RoutineList({ items }: { items: RoutineItem[] }) {
    const sortedItems = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (sortedItems.length === 0) {
        return <div className="text-center py-10 text-zinc-400 text-sm">Nada agendado para este dia.</div>;
    }

    return (
        <div className="space-y-3 relative pb-4">
             <div className="absolute left-[19px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800 -z-10"></div>

            {sortedItems.map((item) => {
                const catKey = (item.category && CATEGORIES[item.category as CategoryKey]) 
                    ? (item.category as CategoryKey) 
                    : 'study';
                
                const style = CATEGORIES[catKey];
                const Icon = style.icon;

                return (
                    <EditRoutineDialog key={item.id} item={item}>
                        <div className="group flex items-start gap-4 cursor-pointer hover:opacity-90 transition-opacity">
                            <div className="flex flex-col items-center mt-1">
                                <div className={`p-2 rounded-full border shadow-sm z-10 bg-white dark:bg-zinc-950 ${style.color.replace('bg-', 'text-').replace('text-', 'border-')}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg border bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{item.title}</span>
                                    <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border">
                                        {item.startTime} - {item.endTime}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 line-clamp-2">{item.description}</p>
                            </div>
                        </div>
                    </EditRoutineDialog>
                )
            })}
        </div>
    )
}

function EditRoutineDialog({ item, children }: { item: RoutineItem, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Editar Bloco</DialogTitle></DialogHeader>
                <RoutineForm item={item} onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

function RoutineForm({ item, onClose }: { item?: RoutineItem, onClose: () => void }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>(
        item?.daysOfWeek ? item.daysOfWeek.split(',') : ['mon', 'tue', 'wed', 'thu', 'fri']
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // Modal de delete

    const toggleDay = (dayId: string) => {
        if(selectedDays.includes(dayId)) setSelectedDays(selectedDays.filter(d => d !== dayId));
        else setSelectedDays([...selectedDays, dayId]);
    }

    const handleSubmit = async (formData: FormData) => {
        if (selectedDays.length === 0) {
            toast.error("Selecione os dias da semana!");
            return;
        }
        setIsLoading(true);
        formData.append('daysOfWeek', selectedDays.join(','));
        
        try {
            if (item) {
                await updateRoutineItem(formData);
                toast.success("Atualizado!");
            } else {
                await createRoutineItem(formData);
                toast.success("Criado!");
            }
            router.refresh();
            onClose();
        } catch {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        setIsLoading(true);
        await deleteRoutineItem(item!.id);
        toast.success("Apagado.");
        router.refresh();
        setIsLoading(false);
        setIsDeleteDialogOpen(false); // Fecha o alert
        onClose(); // Fecha o modal principal
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {item && <input type="hidden" name="id" value={item.id} />}
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="time" name="startTime" defaultValue={item?.startTime || "07:00"} required />
                </div>
                <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="time" name="endTime" defaultValue={item?.endTime || "08:00"} required />
                </div>
            </div>

            <div className="space-y-2">
                <Label>O que fazer?</Label>
                <Input name="title" defaultValue={item?.title} placeholder="Ex: Academia" required />
            </div>

            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select name="category" defaultValue={item?.category || "study"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="health">Saúde / Treino</SelectItem>
                        <SelectItem value="study">Estudos</SelectItem>
                        <SelectItem value="work">Trabalho</SelectItem>
                        <SelectItem value="home">Casa</SelectItem>
                        <SelectItem value="leisure">Lazer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Repetir nos dias:</Label>
                <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                        <div 
                            key={day.id} 
                            onClick={(e) => { e.preventDefault(); toggleDay(day.id); }} 
                            className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border transition-all select-none ${
                                selectedDays.includes(day.id) 
                                ? "bg-indigo-600 text-white border-indigo-600 scale-105" 
                                : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                            }`}
                        >
                            {day.label.charAt(0)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Detalhes</Label>
                <Textarea name="description" defaultValue={item?.description || ""} rows={2} />
            </div>

            <DialogFooter className="gap-2 pt-2 flex justify-between sm:justify-between w-full">
                {item && (
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="icon" disabled={isLoading}>
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
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">Sim, Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 ml-auto" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
            </DialogFooter>
        </form>
    )
}