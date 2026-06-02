"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, Target, Pencil, Wallet, Trophy, Check, AlertCircle, Loader2, Flame, Scale, Snowflake, Sparkles, type LucideIcon } from "lucide-react";
import { addSavings, deleteWishlist } from "@/app/(dashboard)/finance/actions";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WishlistForm, WishlistData } from "./wishlist-form";
import { cn } from "@/lib/utils";
import { useFormatCurrency, useCurrencySymbol } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";
import confetti from "canvas-confetti";


const priorityRank = (p: string) => (p === "URGENT" || p === "HIGH" ? 0 : p === "MEDIUM" ? 1 : 2);

export function WishlistGrid({ items }: { items: WishlistData[] }) {
    const { smartView } = useSmartView();
    const formatMoney = useFormatCurrency();
    if (items.length === 0) return null;

    // Métricas agregadas
    const totalTarget = items.reduce((acc, i) => acc + i.price, 0);
    const totalSaved = items.reduce((acc, i) => acc + Math.min(i.saved, i.price), 0);
    const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
    const completedCount = items.filter((i) => i.saved >= i.price && i.price > 0).length;

    // Ordena: não concluídos primeiro, depois por prioridade e progresso; concluídos no fim
    const sorted = [...items].sort((a, b) => {
        const aDone = a.saved >= a.price && a.price > 0;
        const bDone = b.saved >= b.price && b.price > 0;
        if (aDone !== bDone) return aDone ? 1 : -1;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        const aProg = a.price > 0 ? a.saved / a.price : 0;
        const bProg = b.price > 0 ? b.saved / b.price : 0;
        return bProg - aProg;
    });

    return (
        <div className="space-y-6">
            {/* RESUMO DAS METAS */}
            <div className="rounded-[1.5rem] border border-border/40 bg-card shadow-sm p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <SummaryTile icon={<Target className="h-4 w-4 text-primary" />} label="Metas" value={String(items.length)} />
                        <SummaryTile icon={<Trophy className="h-4 w-4 text-emerald-500" />} label="Conquistadas" value={String(completedCount)} />
                        <SummaryTile icon={<Wallet className="h-4 w-4 text-foreground" />} label="Guardado" value={formatMoney(totalSaved)} blur={smartView} />
                        <SummaryTile icon={<Target className="h-4 w-4 text-amber-500" />} label="Meta total" value={formatMoney(totalTarget)} blur={smartView} />
                    </div>

                    {/* Progresso geral */}
                    <div className="lg:w-72 shrink-0">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso geral</span>
                            <span className="text-sm font-black font-mono text-primary">{Math.round(overallPct)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${overallPct}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* GRADE DE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                {sorted.map(item => <WishlistCard key={item.id} item={item} />)}
            </div>
        </div>
    );
}

function SummaryTile({ icon, label, value, blur }: { icon: React.ReactNode; label: string; value: string; blur?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</p>
                <p className={cn("text-base font-black font-mono tracking-tight text-foreground truncate", blur && "blur-sm select-none")}>{value}</p>
            </div>
        </div>
    );
}

function DepositDialog({ item }: { item: WishlistData }) {
    const formatCurrency = useFormatCurrency();
    const symbol = useCurrencySymbol();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const remaining = item.price - item.saved;

    const handleDeposit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await addSavings(formData);
            toast.success("Dinheiro guardado! Mais um passo. 🚀");
            
            const amount = Number(formData.get('amount'));
            if (item.saved + amount >= item.price) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
            }
            setOpen(false);
        } catch {
            toast.error("Erro ao salvar o valor.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all active:scale-95">
                    <Plus className="h-5 w-5 mr-2" /> Guardar Dinheiro
                </Button>
            </DialogTrigger>
            
            <DialogContent size="sm">
                <DialogHeader
                    icon={<Wallet />}
                    title="Aportar Valor"
                    description="Quanto você deseja guardar hoje para esta meta?"
                />

                <form action={handleDeposit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-6">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xl">{symbol}</span>
                            <Input 
                                name="amount" type="number" step="0.01" placeholder="0.00" autoFocus required 
                                className="pl-14 text-4xl font-black font-mono h-20 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-primary/30 shadow-inner" 
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Faltam {formatCurrency(remaining)}
                            </p>
                            <button type="button" onClick={() => {
                                const input = document.querySelector('input[name="amount"]') as HTMLInputElement;
                                if(input) input.value = remaining.toFixed(2);
                            }} className="text-[10px] font-black uppercase text-primary hover:underline">
                                Completar Meta
                            </button>
                        </div>
                    </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Depósito"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface PriorityConfig { label: string; Icon: LucideIcon; chip: string; accent: string; }

const PRIORITY_CFG: Record<string, PriorityConfig> = {
    HIGH:   { label: "Alta",  Icon: Flame,     chip: "bg-rose-500/10 text-rose-600 border-rose-500/20",   accent: "from-rose-500 to-rose-400" },
    URGENT: { label: "Alta",  Icon: Flame,     chip: "bg-rose-500/10 text-rose-600 border-rose-500/20",   accent: "from-rose-500 to-rose-400" },
    MEDIUM: { label: "Média", Icon: Scale,     chip: "bg-amber-500/10 text-amber-600 border-amber-500/20", accent: "from-amber-500 to-amber-400" },
    LOW:    { label: "Baixa", Icon: Snowflake, chip: "bg-blue-500/10 text-blue-600 border-blue-500/20",    accent: "from-blue-500 to-blue-400" },
};

function WishlistCard({ item }: { item: WishlistData }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { smartView } = useSmartView();
    const formatMoney = useFormatCurrency();

    const progressRaw = item.price > 0 ? (item.saved / item.price) * 100 : 0;
    const progress = Math.min(progressRaw, 100);
    const remaining = Math.max(item.price - item.saved, 0);
    const isCompleted = progress >= 100;
    const isNear = !isCompleted && progress >= 80;

    const pr = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.MEDIUM;
    const accentGradient = isCompleted ? "from-emerald-500 to-emerald-400" : pr.accent;

    const handleDeleteConfirmed = async () => {
        setIsDeleting(true);
        try {
            await deleteWishlist(item.id!);
            toast.success("Meta removida do seu cofre.");
        } catch {
            toast.error("Erro ao remover meta.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden flex flex-col h-full border-border/40 shadow-sm hover:shadow-xl transition-all duration-500 bg-card rounded-[1.5rem] hover:-translate-y-1",
            isCompleted && "border-emerald-500/30 shadow-emerald-500/10"
        )}>
            {/* Faixa de destaque no topo (prioridade / conquista) */}
            <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r z-20", accentGradient)} />

            {/* ÁREA DA IMAGEM */}
            <div className="relative h-48 w-full overflow-hidden flex items-center justify-center p-8 transition-all duration-500 border-b border-border/30">
                {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="relative z-10 w-full h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    // Fallback frictionless: monograma sobre gradiente suave
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/20 to-background flex items-center justify-center">
                        <span className="text-[7rem] leading-none font-black text-foreground/10 select-none transition-transform duration-500 group-hover:scale-110">
                            {(item.name?.trim()?.charAt(0) || "?").toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Badges (Status) */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
                    {isCompleted ? (
                        <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 tracking-widest uppercase animate-in zoom-in duration-300">
                            <Trophy className="h-3.5 w-3.5" /> Conquistado
                        </div>
                    ) : isNear ? (
                        <div className="bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 tracking-widest uppercase animate-in zoom-in duration-300">
                            <Sparkles className="h-3.5 w-3.5" /> Quase lá
                        </div>
                    ) : null}
                </div>
                
                {/* Ações de Edição/Exclusão */}
                <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
                     
                     <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-primary transition-all">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent size="lg">
                            <DialogHeader
                                icon={<Pencil />}
                                title="Editar Meta"
                                description="Ajuste os valores, prioridade ou detalhes do seu sonho."
                            />
                            <DialogBody>
                                <WishlistForm item={item} onClose={() => setIsEditOpen(false)} />
                            </DialogBody>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-rose-500 transition-all">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[90vw] max-w-[425px] translate-x-[-50%] translate-y-[-50%] p-6 rounded-[2rem] border-destructive/20 shadow-2xl bg-background">
                            <AlertDialogHeader>
                                <div className="flex items-center gap-3 text-destructive mb-2">
                                    <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
                                    <AlertDialogTitle className="text-xl font-bold">Desistir do Sonho?</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription className="text-base text-muted-foreground text-left">
                                    Você já guardou <strong className="text-foreground">{formatMoney(item.saved)}</strong> para &quot;{item.name}&quot;. Se você excluir esta meta, o valor voltará para o seu saldo livre.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="rounded-xl h-12 font-bold">Manter Sonho</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-rose-500/20">
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Desistir"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* CONTEÚDO DO CARD */}
            <CardContent className="flex-1 p-6 pb-5 flex flex-col justify-between bg-card">
                <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-lg text-foreground leading-tight line-clamp-2" title={item.name}>{item.name}</h4>
                        {item.productUrl && (
                            <a href={item.productUrl} target="_blank" rel="noreferrer" title="Abrir na loja" className="p-1.5 bg-muted rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                    {/* Chip de prioridade sempre visível */}
                    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border", pr.chip)}>
                        <pr.Icon className="h-3 w-3" /> {pr.label}
                    </span>
                </div>

                <div className="space-y-4 mt-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cofre atual</p>
                            <p className={cn("text-3xl font-black font-mono tracking-tighter tabular-nums leading-none", isCompleted ? "text-emerald-500" : "text-foreground", smartView && "blur-md select-none")}>
                                {formatMoney(item.saved)}
                            </p>
                        </div>
                        <div className="text-right pb-1">
                             <span className={cn("text-xs text-muted-foreground font-bold uppercase tracking-wider", smartView && "blur-sm select-none")}>de {formatMoney(item.price)}</span>
                        </div>
                    </div>

                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r",
                                isCompleted
                                    ? "from-emerald-500 to-emerald-400"
                                    : isNear
                                        ? "from-amber-500 to-amber-400"
                                        : "from-primary to-primary/60"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className={cn(isCompleted && "text-emerald-600", isNear && "text-amber-600")}>
                            {Math.round(progress)}% Concluído
                        </span>
                        {!isCompleted && <span className={cn(smartView && "blur-sm select-none")}>Faltam {formatMoney(remaining)}</span>}
                    </div>
                </div>
            </CardContent>

            {/* RODAPÉ E AÇÃO */}
            <div className="px-6 pb-6 mt-auto bg-card">
                {!isCompleted ? (
                    <DepositDialog item={item} />
                ) : (
                    <Button variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-default font-bold h-12 rounded-xl">
                        <Check className="h-5 w-5 mr-2" /> Meta Atingida!
                    </Button>
                )}
            </div>
        </Card>
    )
}