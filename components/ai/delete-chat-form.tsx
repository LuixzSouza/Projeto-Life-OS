"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { clearChat } from "@/app/(dashboard)/ai/actions";

export function DeleteChatForm({ chatId }: { chatId: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleDelete = async () => {
        setIsPending(true);
        
        // 1. Manda a ordem de execução para o servidor (banco de dados)
        await clearChat(chatId);
        
        // 2. Força um "Hard Reset" no navegador para matar qualquer estado fantasma do React
        window.location.href = "/ai"; 
    };

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDelete}
            disabled={isPending}
            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Protocolo de Limpeza (Wipe Memory)"
            aria-label="Apagar conversa"
        >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin text-rose-500" /> : <Trash2 className="h-5 w-5" />}
        </Button>
    );
}