"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Loader2, ShieldCheck, X, FileUp, Settings2, Sparkles } from "lucide-react";
import { syncBankAccount, createConnectTokenAction, linkAccountToPluggyAction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PluggyConnect } from "react-pluggy-connect";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogBody } from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/* TYPES E INTERFACES                                                         */
/* -------------------------------------------------------------------------- */

interface AccountProp { 
    id: string; 
    isConnected: boolean; 
    name: string; 
}

interface ActionResponse { 
    success: boolean; 
    message: string; 
}

interface PluggyItem {
    id: string;
}

interface PluggySuccessPayload {
    item: PluggyItem;
}

interface PluggyErrorPayload {
    message: string;
    data?: { item?: PluggyItem };
}

/* -------------------------------------------------------------------------- */
/* BOTÃO DE SINCRONIZAÇÃO MANUAL                                              */
/* -------------------------------------------------------------------------- */

export function SyncButton({ accounts }: { accounts: AccountProp[] }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const connectedAccounts = accounts.filter(a => a.isConnected);

    const handleSync = async () => {
        if (connectedAccounts.length === 0) return toast.info("Nenhuma conta conectada.");
        
        setIsSyncing(true);
        const toastId = toast.loading("Buscando novas transações...");

        try {
            for (const acc of connectedAccounts) {
                await syncBankAccount(acc.id);
            }
            toast.success("Sincronização concluída!", { id: toastId });
        } catch {
            toast.error("Erro ao sincronizar algumas contas.", { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || connectedAccounts.length === 0}
            title="Sincronizar bancos conectados"
            className="h-9 shrink-0 gap-1.5 rounded-xl border-border/40 font-medium"
        >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            <span className="hidden lg:inline">{isSyncing ? "Sincronizando…" : "Sincronizar"}</span>
        </Button>
    );
}

/* -------------------------------------------------------------------------- */
/* CONECTOR DE BANCOS (PLUGGY WIDGET NO DIALOG)                               */
/* -------------------------------------------------------------------------- */

export function BankConnector({ onOpenImport }: { onOpenImport?: () => void }) {
    const [connectToken, setConnectToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Controla a abertura do Dialog do Shadcn
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // Diálogo de orientação quando a Pluggy ainda não foi configurada
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const handleStartConnection = async () => {
        setIsLoading(true);
        try {
            const res = await createConnectTokenAction();
            if (!res.success) {
                if (res.reason === "NOT_CONFIGURED") {
                    setIsGuideOpen(true); // Mostra os caminhos disponíveis em vez de um erro seco
                } else {
                    toast.error(res.message);
                }
                return;
            }
            setConnectToken(res.token);
            setIsDialogOpen(true); // Abre o modal do Shadcn
        } catch {
            toast.error("Erro de conexão. Verifique as configurações do provedor bancário.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseConnection = () => {
        setIsDialogOpen(false);
        // Delay minúsculo para garantir que a animação do modal termine antes de destruir o Iframe
        setTimeout(() => setConnectToken(null), 300);
    };

    const handleSuccess = async (payload: PluggySuccessPayload) => {
        handleCloseConnection(); 
        const toastId = toast.loading("Importando histórico financeiro...");
        
        try {
            const result = await linkAccountToPluggyAction(payload.item.id) as ActionResponse;
            if (result.success) {
                toast.success(result.message, { id: toastId });
            } else {
                toast.error(result.message, { id: toastId });
            }
        } catch {
            toast.error("Falha ao processar os dados bancários.", { id: toastId });
        }
    };

    const handleError = (error: PluggyErrorPayload) => {
        console.error("Pluggy Error:", error);
        if (error.message !== "User closed the widget") {
            toast.error("A conexão foi cancelada ou encontrou um erro.");
        }
        handleCloseConnection();
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handleStartConnection}
                disabled={isLoading || !!connectToken}
                title="Conectar banco (Open Finance)"
                className="h-9 shrink-0 gap-1.5 rounded-xl border-border/40 font-medium"
            >
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                <span className="hidden lg:inline">Conectar banco</span>
            </Button>

            {/* Modal Nativo do Shadcn UI cuidando do scroll lock e blur de forma correta */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) handleCloseConnection(); }}>
                <DialogContent showCloseButton={false} className="sm:max-w-[450px] h-[85vh] sm:h-[750px] max-h-[900px] rounded-[2rem]">

                    {/* Cabeçalho Customizado */}
                    <div className="flex justify-between items-center p-4 bg-muted/10 border-b border-border/40 shrink-0">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="sr-only">Conexão Segura</DialogTitle>
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="font-extrabold text-sm uppercase tracking-widest text-foreground">Sincronização Bancária</span>
                        </div>
                        <Button variant="ghost" size="icon" aria-label="Fechar" className="h-8 w-8 rounded-full hover:bg-muted/80" onClick={handleCloseConnection}>
                            <X className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>

                    {/* Área de Injeção do Pluggy */}
                    <div className="flex-1 w-full bg-background relative">
                        {connectToken && (
                            <PluggyConnect 
                                connectToken={connectToken} 
                                includeSandbox={true} 
                                onSuccess={handleSuccess} 
                                onError={handleError} 
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Orientação quando a Pluggy não está configurada: mostra o caminho
                gratuito (importar extrato) antes de mandar o usuário pagar API. */}
            <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
                <DialogContent size="md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold">Como trazer seus dados bancários</DialogTitle>
                        <DialogDescription>
                            A sincronização automática usa a Pluggy (Open Finance), que exige uma conta paga.
                            Mas você não precisa dela para importar seus lançamentos:
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className="space-y-3">
                        <button
                            type="button"
                            onClick={() => { setIsGuideOpen(false); onOpenImport?.(); }}
                            disabled={!onOpenImport}
                            className="w-full rounded-2xl border border-border/40 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md disabled:opacity-60"
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-emerald-500/10 p-2">
                                    <FileUp className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        Importar extrato
                                        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">Grátis</span>
                                    </p>
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Todo banco exporta OFX/CSV — ou cole o texto do extrato e a IA estrutura os lançamentos
                                        <Sparkles className="ml-1 inline h-3 w-3 text-primary" />
                                    </p>
                                </div>
                            </div>
                        </button>

                        <Link
                            href="/settings?tab=integrations"
                            onClick={() => setIsGuideOpen(false)}
                            className="block w-full rounded-2xl border border-border/40 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-primary/10 p-2">
                                    <Settings2 className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-foreground">Configurar a Pluggy</p>
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Sincronização automática via Open Finance. Cadastre o Client ID e o Secret em Integrações &amp; APIs.
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </>
    );
}