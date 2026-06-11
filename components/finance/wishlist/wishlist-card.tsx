"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, Target, Pencil, Wallet, Trophy, Check, AlertCircle, Loader2, Flame, Scale, Snowflake, Sparkles, ShoppingCart, BadgeCheck, ShoppingBag, type LucideIcon } from "lucide-react";
import { buyWishlistItem, deleteWishlist, planWishlistGoal } from "@/app/(dashboard)/finance/actions";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { WishlistForm, WishlistData } from "./wishlist-form";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";
import confetti from "canvas-confetti";

/** Conta disponível para registrar a compra de um desejo. */
export interface WishlistAccountOption {
    id: string;
    name: string;
    balance: number;
    isConnected: boolean;
}

interface WishlistGridProps {
    items: WishlistData[];
    accounts: WishlistAccountOption[];
    /** Soma do saldo de todas as contas — a régua do "já dá pra comprar?". */
    totalBalance: number;
}

const priorityRank = (p: string) => (p === "URGENT" || p === "HIGH" ? 0 : p === "MEDIUM" ? 1 : 2);
const isBought = (i: WishlistData) => i.status === "BOUGHT";

export function WishlistGrid({ items, accounts, totalBalance }: WishlistGridProps) {
    const { smartView } = useSmartView();
    const formatMoney = useFormatCurrency();
    if (items.length === 0) return null;

    // Métricas contra o saldo REAL das contas
    const active = items.filter((i) => !isBought(i));
    const boughtCount = items.length - active.length;
    const affordableCount = active.filter((i) => i.price > 0 && totalBalance >= i.price).length;
    const totalTarget = active.reduce((acc, i) => acc + i.price, 0);
    const purchasePower = totalTarget > 0 ? Math.min(Math.max(totalBalance / totalTarget, 0) * 100, 100) : 0;

    // Ordena: compráveis agora primeiro, depois por prioridade e cobertura; comprados no fim
    const sorted = [...items].sort((a, b) => {
        if (isBought(a) !== isBought(b)) return isBought(a) ? 1 : -1;
        const aAfford = a.price > 0 && totalBalance >= a.price;
        const bAfford = b.price > 0 && totalBalance >= b.price;
        if (aAfford !== bAfford) return aAfford ? -1 : 1;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return a.price - b.price;
    });

    return (
        <div className="space-y-6">
            {/* RESUMO: a lista de desejos comparada com o dinheiro que existe */}
            <div className="rounded-[1.5rem] border border-border/40 bg-card shadow-sm p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <SummaryTile icon={<Target className="h-4 w-4 text-primary" />} label="Desejos" value={String(active.length)} />
                        <SummaryTile icon={<BadgeCheck className="h-4 w-4 text-emerald-500" />} label="Dá pra comprar" value={String(affordableCount)} />
                        <SummaryTile icon={<Wallet className="h-4 w-4 text-foreground" />} label="Saldo em contas" value={formatMoney(totalBalance)} blur={smartView} />
                        <SummaryTile icon={<ShoppingBag className="h-4 w-4 text-amber-500" />} label="Total da lista" value={formatMoney(totalTarget)} blur={smartView} />
                    </div>

                    {/* Poder de compra: quanto da lista o saldo atual cobre */}
                    <div className="lg:w-72 shrink-0">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Poder de compra</span>
                            <span className="text-sm font-black font-mono text-primary">{smartView ? "•••" : `${Math.round(purchasePower)}%`}</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${purchasePower}%` }} />
                        </div>
                        <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                            {boughtCount > 0 ? `${boughtCount} conquistado(s) · ` : ""}quanto da lista seu saldo cobre hoje
                        </p>
                    </div>
                </div>
            </div>

            {/* GRADE DE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-500">
                {sorted.map(item => <WishlistCard key={item.id} item={item} accounts={accounts} totalBalance={totalBalance} />)}
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

/* -------------------------------------------------------------------------- */
/* DIÁLOGO DE COMPRA — registra a despesa real (ou só marca como comprado)    */
/* -------------------------------------------------------------------------- */

const NO_ACCOUNT = "none";

function BuyDialog({ item, accounts, affordable }: { item: WishlistData; accounts: WishlistAccountOption[]; affordable: boolean }) {
    const router = useRouter();
    const formatMoney = useFormatCurrency();
    const { smartView } = useSmartView();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Sugere a primeira conta que cobre o preço; sem nenhuma, só marca.
    const defaultAccount = useMemo(
        () => accounts.find((a) => a.balance >= item.price)?.id ?? accounts[0]?.id ?? NO_ACCOUNT,
        [accounts, item.price],
    );
    const [accountId, setAccountId] = useState<string>(defaultAccount);

    const selected = accounts.find((a) => a.id === accountId);
    const willGoNegative = !!selected && !selected.isConnected && selected.balance < item.price;

    const handleBuy = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.set("id", item.id ?? "");
            formData.set("accountId", accountId === NO_ACCOUNT ? "" : accountId);
            const res = await buyWishlistItem(formData);
            if (res.success) {
                toast.success(res.message);
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#10b981", "#3b82f6", "#f59e0b"] });
                setOpen(false);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error("Erro ao registrar a compra.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {affordable ? (
                    <Button className="w-full h-11 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all active:scale-[0.98]">
                        <ShoppingCart className="h-4 w-4 mr-2" /> Comprar agora
                    </Button>
                ) : (
                    <Button variant="outline" className="w-full h-11 rounded-xl font-semibold border-border/50 text-muted-foreground hover:text-foreground transition-all active:scale-[0.98]">
                        <Check className="h-4 w-4 mr-2" /> Já comprei
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent size="sm">
                <DialogHeader
                    icon={<ShoppingCart />}
                    title="Registrar compra"
                    description={`"${item.name}" sai da lista e vira uma despesa de verdade.`}
                />
                <DialogBody className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/10 px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor</span>
                        <span className={cn("text-2xl font-black font-mono tabular-nums text-foreground", smartView && "blur-md select-none")}>
                            {formatMoney(item.price)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pagar com</p>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 font-medium">
                                <SelectValue placeholder="Escolha a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} — {smartView ? "•••••" : formatMoney(a.balance)}
                                    </SelectItem>
                                ))}
                                <SelectItem value={NO_ACCOUNT}>Só marcar como comprado (sem lançar despesa)</SelectItem>
                            </SelectContent>
                        </Select>
                        {accountId !== NO_ACCOUNT && (
                            <p className="text-[11px] text-muted-foreground px-1">
                                {selected?.isConnected
                                    ? "Conta sincronizada — o saldo será atualizado pelo banco."
                                    : "A despesa entra no extrato e o saldo da conta é ajustado."}
                            </p>
                        )}
                        {willGoNegative && (
                            <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] font-bold text-amber-600">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> O saldo desta conta vai ficar negativo.
                            </p>
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={handleBuy} disabled={isLoading} className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar compra"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* -------------------------------------------------------------------------- */
/* PLANO DE COMPRA — wishlist→meta com 1 clique (#26 do IA_ROADMAP)           */
/* -------------------------------------------------------------------------- */

function PlanButton({ item }: { item: WishlistData }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handlePlan = async () => {
        if (loading || !item.id) return;
        setLoading(true);
        try {
            const res = await planWishlistGoal(item.id);
            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.info(res.message);
            }
        } catch {
            toast.error("Erro ao montar o plano de compra.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            onClick={handlePlan}
            disabled={loading}
            title="Calcula o prazo realista pela sua sobra mensal real e cria uma tarefa-plano com a data prevista"
            className="w-full h-9 rounded-xl text-xs font-bold text-muted-foreground hover:text-primary"
        >
            {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <><Target className="h-3.5 w-3.5 mr-1.5" /> Montar plano de compra</>}
        </Button>
    );
}

/* -------------------------------------------------------------------------- */
/* CARD DE DESEJO                                                             */
/* -------------------------------------------------------------------------- */

interface PriorityConfig { label: string; Icon: LucideIcon; chip: string; }

const PRIORITY_CFG: Record<string, PriorityConfig> = {
    HIGH:   { label: "Alta",  Icon: Flame,     chip: "bg-rose-500/10 text-rose-600" },
    URGENT: { label: "Alta",  Icon: Flame,     chip: "bg-rose-500/10 text-rose-600" },
    MEDIUM: { label: "Média", Icon: Scale,     chip: "bg-amber-500/10 text-amber-600" },
    LOW:    { label: "Baixa", Icon: Snowflake, chip: "bg-blue-500/10 text-blue-600" },
};

/** Pílula de status sobre a imagem — fundo claro com blur, sem cor chapada. */
function StatusPill({ icon: Icon, text, className }: { icon: LucideIcon; text: string; className: string }) {
    return (
        <div className={cn(
            "flex items-center gap-1.5 rounded-full border bg-background/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold shadow-sm animate-in zoom-in duration-300",
            className
        )}>
            <Icon className="h-3 w-3" /> {text}
        </div>
    );
}

function WishlistCard({ item, accounts, totalBalance }: { item: WishlistData; accounts: WishlistAccountOption[]; totalBalance: number }) {
    const router = useRouter();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { smartView } = useSmartView();
    const formatMoney = useFormatCurrency();

    const bought = isBought(item);
    // Cobertura: quanto do preço o saldo TOTAL das contas já cobre hoje
    const coverage = item.price > 0 ? Math.min(Math.max(totalBalance / item.price, 0) * 100, 100) : 0;
    const affordable = !bought && item.price > 0 && totalBalance >= item.price;
    const missing = Math.max(item.price - totalBalance, 0);
    const isNear = !bought && !affordable && coverage >= 80;

    const pr = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.MEDIUM;

    const handleDeleteConfirmed = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteWishlist(item.id!);
            toast.success("Desejo removido da lista.");
            setIsConfirmOpen(false);
            router.refresh(); // garante que o card suma da lista na hora
        } catch (e) {
            console.error("Erro ao remover desejo:", e);
            toast.error(e instanceof Error ? e.message : "Erro ao remover desejo.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card className={cn(
            "group relative flex h-full flex-col overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-md",
            affordable ? "hover:border-emerald-500/40" : "hover:border-primary/30",
            bought && "opacity-90"
        )}>
            {/* ÁREA DA IMAGEM */}
            <div className="relative h-40 w-full shrink-0 overflow-hidden border-b border-border/30 bg-gradient-to-br from-muted/40 via-muted/15 to-background">
                {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={cn(
                            "h-full w-full object-contain p-6 drop-shadow-md transition-transform duration-300 group-hover:scale-[1.04]",
                            bought && "grayscale opacity-60"
                        )}
                    />
                ) : (
                    // Fallback frictionless: monograma suave
                    <div className="flex h-full w-full items-center justify-center">
                        <span className={cn(
                            "text-6xl font-black text-foreground/[0.08] select-none transition-transform duration-300 group-hover:scale-105",
                            bought && "opacity-60"
                        )}>
                            {(item.name?.trim()?.charAt(0) || "?").toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Status (uma pílula só, discreta) */}
                <div className="absolute right-3 top-3 z-10">
                    {bought ? (
                        <StatusPill icon={Trophy} text="Comprado" className="border-emerald-500/30 text-emerald-600" />
                    ) : affordable ? (
                        <StatusPill icon={BadgeCheck} text="Dá pra comprar" className="border-emerald-500/30 text-emerald-600" />
                    ) : isNear ? (
                        <StatusPill icon={Sparkles} text="Quase lá" className="border-amber-500/30 text-amber-600" />
                    ) : null}
                </div>

                {/* Ações de Edição/Exclusão (aparecem no hover em desktop) */}
                <div className="absolute left-3 top-3 z-10 flex gap-1.5 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">

                     <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-primary transition-all">
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent size="lg">
                            <DialogHeader
                                icon={<Pencil />}
                                title="Editar Desejo"
                                description="Ajuste o preço, prioridade ou detalhes do seu sonho."
                            />
                            <DialogBody>
                                <WishlistForm item={item} onClose={() => setIsEditOpen(false)} />
                            </DialogBody>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-md shadow-sm border border-border/50 hover:text-rose-500 transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-destructive/20">
                            <AlertDialogHeader>
                                <div className="p-3 rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="h-6 w-6" /></div>
                                <AlertDialogTitle className="text-xl font-bold normal-case tracking-normal">Desistir do Sonho?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-muted-foreground">
                                    &quot;{item.name}&quot; ({formatMoney(item.price)}) será removido da sua lista de desejos. Tem certeza?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold">Manter Sonho</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => { e.preventDefault(); void handleDeleteConfirmed(); }}
                                    disabled={isDeleting}
                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-rose-500/20"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Desistir"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* CONTEÚDO */}
            <CardContent className="flex flex-1 flex-col p-5">
                {/* Prioridade + link da loja */}
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", pr.chip)}>
                        <pr.Icon className="h-3 w-3" /> {pr.label}
                    </span>
                    {item.productUrl && (
                        <a href={item.productUrl} target="_blank" rel="noreferrer" title="Abrir na loja" className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>

                <h4 className="min-h-[2.6rem] text-[15px] font-bold leading-snug text-foreground line-clamp-2" title={item.name}>
                    {item.name}
                </h4>

                {/* Preço + cobertura do saldo (uma informação, um lugar) */}
                <div className="mt-auto space-y-2 pt-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("text-[22px] font-extrabold tabular-nums tracking-tight leading-none", bought ? "text-muted-foreground line-through decoration-2" : "text-foreground", smartView && "blur-md select-none")}>
                            {formatMoney(item.price)}
                        </p>
                        {!bought && !affordable && (
                            <span className={cn("text-[11px] font-bold tabular-nums", isNear ? "text-amber-600" : "text-muted-foreground")}>
                                {Math.round(coverage)}% no saldo
                            </span>
                        )}
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                bought || affordable ? "bg-emerald-500" : isNear ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${bought ? 100 : coverage}%` }}
                        />
                    </div>

                    <p className={cn("text-[11px] font-medium", (bought || affordable) ? "text-emerald-600" : "text-muted-foreground")}>
                        {bought
                            ? "Desejo conquistado 🎉"
                            : affordable
                                ? "Seu saldo já cobre este desejo"
                                : <>Faltam <span className={cn("font-bold tabular-nums", smartView && "blur-sm select-none")}>{formatMoney(missing)}</span> no saldo</>}
                    </p>
                </div>
            </CardContent>

            {/* AÇÃO */}
            <div className="px-5 pb-5 space-y-2">
                {bought ? (
                    <Button variant="outline" className="w-full h-11 rounded-xl border-emerald-500/25 bg-emerald-500/5 font-semibold text-emerald-600 hover:bg-emerald-500/10 cursor-default">
                        <Check className="h-4 w-4 mr-2" /> Comprado!
                    </Button>
                ) : (
                    <>
                        <BuyDialog item={item} accounts={accounts} affordable={affordable} />
                        {!affordable && <PlanButton item={item} />}
                    </>
                )}
            </div>
        </Card>
    )
}
