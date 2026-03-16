"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Loader2, ShieldCheck, X } from "lucide-react";
import { syncBankAccount, createConnectTokenAction, linkAccountToPluggyAction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PluggyConnect } from "react-pluggy-connect";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
            className="gap-2 rounded-xl h-10 font-bold border-border/50 text-foreground/80 hover:bg-muted transition-all active:scale-95"
        >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar Bancos"}</span>
            <span className="sm:hidden">{isSyncing ? "Buscando..." : "Sincronizar"}</span>
        </Button>
    );
}

/* -------------------------------------------------------------------------- */
/* CONECTOR DE BANCOS (PLUGGY WIDGET NO DIALOG)                               */
/* -------------------------------------------------------------------------- */

export function BankConnector() {
    const [connectToken, setConnectToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Controla a abertura do Dialog do Shadcn
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleStartConnection = async () => {
        setIsLoading(true);
        try {
            const token = await createConnectTokenAction(); 
            if (!token) throw new Error("Falha ao obter token");
            setConnectToken(token);
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
                onClick={handleStartConnection} 
                disabled={isLoading || !!connectToken} 
                className="gap-2 rounded-xl h-10 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all active:scale-95"
            >
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                Conectar Banco
            </Button>

            {/* Modal Nativo do Shadcn UI cuidando do scroll lock e blur de forma correta */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) handleCloseConnection(); }}>
                <DialogContent className="sm:max-w-[450px] h-[85vh] sm:h-[750px] max-h-[900px] p-0 overflow-hidden flex flex-col rounded-[2rem] border-border/40 shadow-2xl [&>button]:hidden">
                    
                    {/* Cabeçalho Customizado */}
                    <div className="flex justify-between items-center p-4 bg-muted/10 border-b border-border/40 shrink-0">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="sr-only">Conexão Segura</DialogTitle>
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="font-extrabold text-sm uppercase tracking-widest text-foreground">Sincronização Bancária</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/80" onClick={handleCloseConnection}>
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
        </>
    );
}