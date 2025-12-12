import { prisma } from "@/lib/prisma";
import { clearChat } from "./actions";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Trash2 } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { Progress } from "@/components/ui/progress";
import { Prisma } from "@prisma/client";
import { ModelSelector } from "@/components/ai/model-selector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    const CONTEXT_LIMIT = 4096; // Token limit aproximado
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4); // +500 de margem para o System Prompt
    const memoryUsage = Math.min((estimatedTokens / CONTEXT_LIMIT) * 100, 100);
    const memoryPercentage = Math.round(memoryUsage);
    
    // Cores dinâmicas para o status de memória
    const memoryColor = memoryPercentage > 85 ? "bg-red-500" : memoryPercentage > 50 ? "bg-amber-500" : "bg-emerald-500";
    const memoryTextColor = memoryPercentage > 85 ? "text-red-500" : memoryPercentage > 50 ? "text-amber-500" : "text-emerald-500";

    const chatID = latestChat?.id;
    
    // Conversão de mensagens para o formato do componente
    const initialMessages: InitialMessageProps[] = latestChat?.messages.map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant" 
    })) || [];

    // Configurações atuais (fallback inteligente)
    const currentProvider = settings?.aiProvider || "ollama";
    const currentModel = settings?.aiModel || "llama3";

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50/30 dark:bg-black overflow-hidden relative">
            
            {/* --- HEADER DE COMANDO --- */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shrink-0 gap-4 sm:gap-0 z-20">
                
                {/* Lado Esquerdo: Título e Status */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-9 w-9 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                        <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-none flex items-center gap-2">
                            Life OS AI 
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">BETA</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                                {currentProvider === 'ollama' ? 'Local System' : 'Cloud Connected'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Lado Direito: Controles */}
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end">
                    
                    {/* Seletor de Modelo */}
                    <ModelSelector 
                        currentProvider={settings?.aiProvider || "ollama"} 
                        currentModel={settings?.aiModel || "llama3"} 
                    />

                    <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

                    {/* Barra de Memória com Tooltip Explicativo */}
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="hidden md:flex flex-col items-end w-28 gap-1 cursor-help">
                                    <div className="flex justify-between w-full text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                        <span>Contexto</span>
                                        <span className={memoryTextColor}>{memoryPercentage}%</span>
                                    </div>
                                    <Progress 
                                        value={memoryPercentage} 
                                        className="h-1 w-full bg-zinc-200 dark:bg-zinc-800" 
                                        indicatorClassName={memoryColor}
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs max-w-[220px] bg-zinc-900 text-white border-zinc-800">
                                <p>Uso da &quot;memória de curto prazo&quot; da IA. Se encher, ela começará a esquecer o início da conversa.</p>
                                <p className="mt-2 font-mono text-zinc-400 border-t border-zinc-800 pt-1">
                                    {estimatedTokens} / {CONTEXT_LIMIT} tokens estimados
                                </p>
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
                                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-full"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Nova Conversa (Limpar Memória)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </form>
                    )}
                </div>
            </div>

            {/* --- ÁREA DE CHAT --- */}
            <div className="flex-1 min-h-0 relative"> 
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