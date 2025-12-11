"use client";

import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";
import { createConnectTokenAction, linkAccountToPluggyAction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";

// ✅ 1. Definimos a interface do payload de sucesso
interface PluggySuccessPayload {
    item: {
        id: string;
    };
}

export function BankConnector() {
    const [connectToken, setConnectToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleStartConnection = async () => {
        setIsLoading(true);
        try {
            const token = await createConnectTokenAction(); 
            setConnectToken(token);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao iniciar conexão. Verifique suas credenciais.");
        }
        setIsLoading(false);
    };

    // ✅ 2. Tipagem explícita substitui o 'any' implícito ou incorreto
    const handleSuccess = async (payload: PluggySuccessPayload) => {
        const itemId = payload.item.id;
        console.log("Conexão realizada! Item ID:", itemId);
        
        setConnectToken(null); // Fecha o modal
        
        const toastId = toast.loading("Importando contas e saldo...");
        
        try {
            const result = await linkAccountToPluggyAction(itemId);
            
            if (result.success) {
                toast.success(result.message, { id: toastId });
            } else {
                toast.error(result.message, { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha ao vincular contas.", { id: toastId });
        }
    };

    // ✅ 3. Usamos 'unknown' em vez de 'any' para erros (boa prática)
    const handleError = (error: unknown) => {
        console.error("Erro no Widget Pluggy:", error);
        toast.error("A conexão foi cancelada ou falhou.");
    };

    return (
        <>
            <Button 
                onClick={handleStartConnection} 
                disabled={isLoading} 
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                Conectar Conta Bancária
            </Button>

            {connectToken && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg h-[650px] relative shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-end p-2 bg-zinc-50 border-b">
                            <button 
                                onClick={() => setConnectToken(null)}
                                className="text-sm font-bold text-zinc-500 hover:text-zinc-800 px-3 py-1"
                            >
                                Fechar
                            </button>
                        </div>
                        
                        <div className="flex-1 w-full relative">
                            <PluggyConnect
                                connectToken={connectToken}
                                includeSandbox={true} 
                                onSuccess={handleSuccess}
                                onError={handleError}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}