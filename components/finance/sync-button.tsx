"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncBankAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccountProp {
    id: string;
    isConnected: boolean;
    name: string;
}

export function SyncButton({ accounts }: { accounts: AccountProp[] }) {
    const [isSyncing, setIsSyncing] = useState(false);

    // Filtra apenas contas que têm vínculo com Pluggy
    const connectedAccounts = accounts.filter(a => a.isConnected);

    const handleSync = async () => {
        if (connectedAccounts.length === 0) {
            toast.info("Nenhuma conta bancária conectada para sincronizar.");
            return;
        }

        setIsSyncing(true);
        const toastId = toast.loading("Sincronizando transações...");

        try {
            let totalNew = 0;
            // Executa em série para não sobrecarregar a API
            for (const acc of connectedAccounts) {
                const result = await syncBankAccount(acc.id);
                if (result.success) {
                    // Extrai número da string "X novas transações" se possível, ou conta como sucesso
                    totalNew++; 
                }
            }
            toast.success("Sincronização concluída!", { id: toastId });
        } catch (error) {
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
            className="gap-2 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
        >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Bancos"}
        </Button>
    );
}