import { prisma } from "@/lib/prisma";
import { clearChat } from "./actions";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Trash2, Cpu, Cloud, Sparkles, Zap } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { Progress } from "@/components/ui/progress";
import { Prisma } from "@prisma/client";
import { ModelSelector } from "@/components/ai/model-selector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Tipagens do Prisma
const chatWithMessages = Prisma.validator<Prisma.AiChatDefaultArgs>()({
    include: { messages: { orderBy: { createdAt: 'asc' } } }
});
type ChatWithMessages = Prisma.AiChatGetPayload<typeof chatWithMessages>;

// Interface para o ChatInterface (Frontend)
interface InitialMessageProps {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    chatId: string;
}

export default async function AIPage() {
    // 1. Busca configurações e chat mais recente em paralelo
    const [latestChat, settings] = await Promise.all([
        prisma.aiChat.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        }),
        prisma.settings.findFirst()
    ]);

    // --- CÁLCULO DE MEMÓRIA (Context Window) ---
    // 
    const CONTEXT_LIMIT = 4096; // Token limit aproximado
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4); // +500 de margem para o System Prompt
    const memoryUsage = Math.min((estimatedTokens / CONTEXT_LIMIT) * 100, 100);
    const memoryPercentage = Math.round(memoryUsage);
    
    // Lógica de Cores Semânticas
    const getMemoryStatus = (pct: number) => {
        if (pct > 90) return { color: "bg-destructive", text: "text-destructive", label: "Crítico" };
        if (pct > 70) return { color: "bg-amber-500", text: "text-amber-500", label: "Alto" };
        return { color: "bg-primary", text: "text-primary", label: "Saudável" };
    };

    const status = getMemoryStatus(memoryPercentage);
    const chatID = latestChat?.id;
    
    const initialMessages: InitialMessageProps[] = latestChat?.messages.map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant" 
    })) || [];

    const currentProvider = settings?.aiProvider || "ollama";
    const currentModel = settings?.aiModel || "llama3";
    const isLocal = currentProvider === 'ollama';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background relative overflow-hidden">
            
            {/* --- HEADER DE COMANDO --- */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md shrink-0 gap-4 sm:gap-0 z-20">
                
                {/* Lado Esquerdo: Identidade */}
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
                
                {/* Lado Direito: Controles */}
                <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-end">
                    
                    {/* Seletor de Modelo */}
                    <div className="w-full sm:w-auto">
                        <ModelSelector 
                            currentProvider={currentProvider} 
                            currentModel={currentModel} 
                        />
                    </div>

                    <div className="hidden md:block h-8 w-px bg-border" />

                    {/* Barra de Memória */}
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="hidden md:flex flex-col items-end w-32 gap-1.5 cursor-help group">
                                    <div className="flex justify-between w-full text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Memória</span>
                                        <span className={cn("transition-colors", status.text)}>{memoryPercentage}%</span>
                                    </div>
                                    <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full transition-all duration-500", status.color)} 
                                            style={{ width: `${memoryPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs w-60 p-3 bg-popover border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-foreground">Janela de Contexto</span>
                                    <Badge variant="outline" className="text-[10px] h-5">{status.label}</Badge>
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                    Representa a &quot;memória de curto prazo&quot; da IA. Se encher, ela esquecerá o início da conversa.
                                </p>
                                <div className="mt-3 pt-2 border-t border-border flex justify-between text-xs font-mono text-muted-foreground">
                                    <span>Usado: {estimatedTokens} tk</span>
                                    <span>Limite: {CONTEXT_LIMIT} tk</span>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Botão de Limpar (Clear Chat) */}
                    {chatID && (
                        <form action={clearChat.bind(null, chatID)}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Reiniciar Memória (Nova Conversa)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </form>
                    )}
                </div>
            </div>

            {/* --- ÁREA DE CHAT --- */}
            <div className="flex-1 min-h-0 relative bg-muted/5"> 
                 {/* Passamos as configurações para o ChatInterface renderizar a "Persona" visual correta */}
                 <ChatInterface 
                    initialChatId={chatID} 
                    initialMessages={initialMessages} 
                    provider={currentProvider}
                    model={currentModel}
                 />
            </div>
        </div>
    );
}