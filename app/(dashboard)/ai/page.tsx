import { prisma } from "@/lib/prisma";
import { ChatInterface } from "@/components/ai/chat-interface";
import { BrainCircuit, Sparkles, Cloud, Cpu, Zap, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ai/model-selector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { clearChat } from "./actions";

// ... (Mantenha suas tipagens e funções auxiliares aqui) ...

export default async function AIPage() {
    // ... (Seu carregamento de dados existente) ...
    const [latestChat, settings] = await Promise.all([
        prisma.aiChat.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        }),
        prisma.settings.findFirst()
    ]);

    // ... (Cálculo de memória existente) ...
    const CONTEXT_LIMIT = 4096;
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4);
    const memoryUsage = Math.min((estimatedTokens / CONTEXT_LIMIT) * 100, 100);
    const memoryPercentage = Math.round(memoryUsage);

    const getMemoryStatus = (pct: number) => {
        if (pct > 90) return { color: "bg-destructive", text: "text-destructive", label: "Crítico" };
        if (pct > 70) return { color: "bg-amber-500", text: "text-amber-500", label: "Alto" };
        return { color: "bg-primary", text: "text-primary", label: "Saudável" };
    };
    const status = getMemoryStatus(memoryPercentage);

    const chatID = latestChat?.id;
    const initialMessages = latestChat?.messages.map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
    })) || [];

    const currentProvider = settings?.aiProvider || "ollama";
    const currentModel = settings?.aiModel || "llama3";
    const isLocal = currentProvider === 'ollama';

    return (
        // ✅ CORREÇÃO 1: h-[calc(100vh-4rem)] ajusta para a altura da viewport menos a sidebar/header global se houver.
        // Se não tiver header global acima, use h-screen.
        // overflow-hidden é CRUCIAL aqui.
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-background relative overflow-hidden">
            
            {/* --- HEADER (Fixo no topo) --- */}
            {/* shrink-0 impede que o header encolha quando o teclado virtual abrir no mobile */}
            <header className="shrink-0 flex flex-col sm:flex-row items-center justify-between border-b border-border/60 bg-gradient-to-b from-primary/5 to-background py-4 px-6 md:px-8 z-20">
                
                {/* Lado Esquerdo */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-foreground leading-none flex items-center gap-2">
                            Life OS AI 
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5">
                                <Sparkles className="w-2 h-2 mr-1" /> BETA
                            </Badge>
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 h-5 font-medium border gap-1", isLocal ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/10" : "border-blue-500/20 text-blue-600 bg-blue-500/10")}>
                                {isLocal ? <Cpu className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                                {isLocal ? 'Processamento Local' : 'Nuvem Conectada'}
                            </Badge>
                        </div>
                    </div>
                </div>
                
                {/* Lado Direito */}
                <div className="hidden sm:flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-end">
                    <ModelSelector currentProvider={currentProvider} currentModel={currentModel} />
                    <div className="h-8 w-px bg-border" />
                    
                    {/* Barra de Memória (Compactada para não ocupar muito espaço) */}
                    <div className="flex flex-col items-end w-24 gap-1">
                         <div className="flex justify-between w-full text-[9px] uppercase font-bold text-muted-foreground">
                            <span>Memória</span>
                            <span className={status.text}>{memoryPercentage}%</span>
                         </div>
                         <div className="relative w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-500", status.color)} style={{ width: `${memoryPercentage}%` }} />
                         </div>
                    </div>

                    {/* Botão Limpar */}
                    {chatID && (
                        <form action={clearChat.bind(null, chatID)}>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                             </Button>
                        </form>
                    )}
                </div>
            </header>

            {/* --- ÁREA PRINCIPAL (Flex-1 para ocupar o resto) --- */}
            {/* overflow-hidden garante que o scroll seja gerenciado pelo filho */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/5 relative">
                 <ChatInterface 
                    initialChatId={chatID} 
                    initialMessages={initialMessages} 
                    provider={currentProvider}
                    model={currentModel}
                 />
            </main>
        </div>
    );
}