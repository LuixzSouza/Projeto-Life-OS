"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Wallet, Trash2, MoreVertical, Pencil, Copy, Check, Link2, Nfc, Tags,
  Landmark, PiggyBank, TrendingUp, Banknote, AlertCircle, Loader2, type LucideIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AccountDialog } from "./account-dialog";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";

interface AccountItem {
    id: string;
    name: string;
    balance: number;
    color: string | null;
    type: string;
    isConnected?: boolean;
    provider?: string | null;
}

interface TypeMeta { label: string; Icon: LucideIcon; }

const TYPE_META: Record<string, TypeMeta> = {
    CHECKING:   { label: "Conta Corrente", Icon: Landmark },
    SAVINGS:    { label: "Poupança",       Icon: PiggyBank },
    INVESTMENT: { label: "Investimento",   Icon: TrendingUp },
    CASH:       { label: "Dinheiro Físico", Icon: Banknote },
};
const typeMeta = (t: string): TypeMeta => TYPE_META[t] ?? { label: "Carteira", Icon: Wallet };

export function AccountsList({ accounts }: { accounts: AccountItem[] }) {
    const router = useRouter();
    const formatMoney = useFormatCurrency();
    const { smartView } = useSmartView();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Estado unificado do Modal
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);
    const [connAccount, setConnAccount] = useState<{ id: string; title: string } | null>(null);

    // Exclusão com confirmação premium (substitui o confirm() nativo)
    const [deleteTarget, setDeleteTarget] = useState<AccountItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Abre modal em modo CRIAÇÃO
    const handleCreate = () => {
        setSelectedAccount(null);
        setIsDialogOpen(true);
    };

    // Abre modal em modo EDIÇÃO
    const handleEdit = (acc: AccountItem) => {
        setSelectedAccount(acc);
        setIsDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget || isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteAccount(deleteTarget.id);
            toast.success("Conta encerrada.");
            setDeleteTarget(null);
            router.refresh();
        } catch (e) {
            console.error("Erro ao encerrar conta:", e);
            toast.error(e instanceof Error ? e.message : "Erro ao encerrar a conta.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Resumo agregado
    const total = accounts.reduce((acc, a) => acc + a.balance, 0);
    const connectedCount = accounts.filter((a) => a.isConnected).length;

    if (!isMounted) return <div className="flex gap-5 overflow-hidden pb-6"><div className="w-[320px] h-[200px] bg-muted rounded-2xl animate-pulse" /></div>;

    return (
        <div className="w-full space-y-5">
            {/* RESUMO: patrimônio em contas */}
            {accounts.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border/40 bg-card/60 px-5 py-4">
                    <SummaryStat
                        label="Patrimônio em contas"
                        value={formatMoney(total)}
                        blur={smartView}
                        accent
                    />
                    <SummaryStat label="Contas" value={String(accounts.length)} />
                    <SummaryStat label="Conectadas" value={`${connectedCount}/${accounts.length}`} />
                </div>
            )}

            <div className="flex gap-5 overflow-x-auto pb-8 pt-2 px-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent snap-x snap-mandatory">

                {/* Botão Nova Conta */}
                <div
                    onClick={handleCreate}
                    className="min-w-[320px] h-[200px] rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-all group snap-center active:scale-95 duration-200"
                >
                    <div className="h-14 w-14 rounded-full bg-background shadow-sm border border-border flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-primary/50">
                        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground mt-4 transition-colors">
                        Nova Carteira
                    </span>
                </div>

                {/* Lista de Contas */}
                {accounts.map(acc => (
                    <div key={acc.id} className="snap-center">
                        <BankCard
                            account={acc}
                            onEdit={() => handleEdit(acc)}
                            onDelete={() => setDeleteTarget(acc)}
                            onConnections={() => setConnAccount({ id: acc.id, title: acc.name })}
                        />
                    </div>
                ))}
            </div>

            {/* Único Dialog Controlado para Criar e Editar */}
            <AccountDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                account={selectedAccount}
            />

            <EntityConnectionsDialog
                entityType="account"
                item={connAccount}
                onOpenChange={(o) => !o && setConnAccount(null)}
            />

            {/* Confirmação de exclusão */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !isDeleting) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-2xl border-destructive/20">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 text-destructive mb-1">
                            <div className="p-3 rounded-2xl bg-destructive/10"><AlertCircle className="h-6 w-6" /></div>
                            <AlertDialogTitle className="text-xl font-bold">Encerrar conta?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base text-muted-foreground text-left">
                            Isso apaga <strong className="text-foreground">{deleteTarget?.name}</strong> e todo o histórico de transações vinculado a ela. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-bold px-8 shadow-lg shadow-rose-500/20"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, encerrar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function SummaryStat({ label, value, blur, accent }: { label: string; value: string; blur?: boolean; accent?: boolean }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn(
                "font-mono font-black tracking-tight tabular-nums truncate",
                accent ? "text-2xl text-foreground" : "text-xl text-foreground/80",
                accent && "privacy-blur", // borra no Modo Discreto global
                blur && accent && "blur-sm select-none",
            )}>
                {value}
            </p>
        </div>
    );
}

function BankCard({ account, onEdit, onDelete, onConnections }: { account: AccountItem, onEdit: () => void, onDelete: () => void, onConnections: () => void }) {
    const [copied, setCopied] = useState(false);
    const formatMoney = useFormatCurrency();
    const { smartView } = useSmartView();
    const meta = typeMeta(account.type);

    const handleCopyBalance = () => {
        navigator.clipboard.writeText(account.balance.toString());
        setCopied(true);
        toast.success("Saldo copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formattedBalance = formatMoney(account.balance);

    return (
        <div
            className="relative min-w-[320px] h-[200px] rounded-2xl shadow-md overflow-hidden text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group select-none"
            style={{
                background: `linear-gradient(135deg, ${account.color || '#18181b'} 0%, #000000 100%)`
            }}
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-white/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 p-7 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
                            {account.isConnected ? <Link2 className="h-5 w-5 text-emerald-300" /> : <meta.Icon className="h-5 w-5 text-white/90" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-wide text-base truncate max-w-[150px] drop-shadow-md">
                                {account.name}
                            </span>
                            {account.isConnected ? (
                                <span className="text-[10px] text-emerald-300/90 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Sync Ativo
                                </span>
                            ) : (
                                <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{meta.label}</span>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors outline-none text-white/70 hover:text-white">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={onConnections} className="cursor-pointer"><Tags className="h-4 w-4 mr-2" /> Tags & Anexos</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyBalance} className="cursor-pointer"><Copy className="h-4 w-4 mr-2" /> Copiar Saldo</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mr-2" /> Encerrar</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center justify-between opacity-80 pl-1">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-tr from-yellow-200 via-yellow-400 to-yellow-600 border border-yellow-700/30 relative overflow-hidden shadow-inner flex items-center justify-center">
                         <div className="w-full h-[1px] bg-yellow-800/30 absolute"></div>
                         <div className="h-full w-[1px] bg-yellow-800/30 absolute"></div>
                    </div>
                    <Nfc className="h-8 w-8 text-white/40 rotate-90" />
                </div>

                <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1 font-medium pl-1">Saldo Atual</p>
                    <div
                        className="flex items-center gap-3 cursor-pointer group/balance w-fit"
                        onClick={handleCopyBalance}
                        title="Clique para copiar"
                    >
                        <h3 className={cn("privacy-blur text-3xl font-mono font-bold tracking-tighter text-white drop-shadow-md", smartView && "blur-md select-none")}>
                            {formattedBalance}
                        </h3>
                        {copied ? <Check className="h-5 w-5 text-emerald-400 animate-in zoom-in" /> : <Copy className="h-4 w-4 text-white/30 opacity-0 group-hover/balance:opacity-100 transition-opacity" />}
                    </div>
                </div>
            </div>
        </div>
    );
}
