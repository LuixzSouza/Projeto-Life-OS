import { prisma } from "@/lib/prisma";
import { clearChat } from "./actions"; // Apenas o clearChat
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Trash2, BrainCircuit, Sparkles, AlertTriangle } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";
// ✅ CORREÇÃO 1: Importar o Progress do seu projeto UI (shadcn)
import { Progress } from "@/components/ui/progress"; 


// 1. Tipagem segura para o retorno do Prisma
const chatWithMessages = Prisma.validator<Prisma.AiChatDefaultArgs>()({
    include: { messages: { orderBy: { createdAt: 'asc' } } }
});
type ChatWithMessages = Prisma.AiChatGetPayload<typeof chatWithMessages>;

// ✅ CORREÇÃO 2: Criar um tipo de mensagem que o frontend entenda para a conversão segura.
// Aqui, criamos um tipo auxiliar que garanta o "role" estrito para passar ao frontend.
interface InitialMessageProps {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    chatId: string;
}

export default async function AIPage() {
    // Busca o chat mais recente
    const latestChat: ChatWithMessages | null = await prisma.aiChat.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    // --- CÁLCULO DE MEMÓRIA ---
    const CONTEXT_LIMIT = 4096;
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4);
    const memoryUsage = Math.min((estimatedTokens / CONTEXT_LIMIT) * 100, 100);
    const memoryPercentage = Math.round(memoryUsage);
    
    const memoryColor = memoryPercentage > 80 ? "bg-red-500" : memoryPercentage > 50 ? "bg-yellow-500" : "bg-green-500";
    const memoryWarning = memoryPercentage > 80 ? `Memória Cheia (${estimatedTokens} tokens)` : `Memória: ${estimatedTokens} tokens`;

    const chatID = latestChat?.id;
    
    // ✅ CONVERSÃO FINAL PARA O TIPO ESPERADO PELO CLIENT COMPONENT
    const initialMessages: InitialMessageProps[] = latestChat?.messages.map(msg => ({
        // O Prisma retorna 'role' como 'string' no tipo de execução, mas na verdade
        // são os valores 'user' | 'assistant'. Castamos para o tipo estrito do frontend.
        ...msg,
        role: msg.role as "user" | "assistant" 
    })) || [];


    return (
        // Container principal que deve preencher a área de conteúdo do dashboard
        <div className="min-h-screen p-4 md:p-6 flex flex-col gap-4 overflow-hidden bg-zinc-50/50 dark:bg-black">
            
            {/* --- HEADER FIXO --- */}
            <div className="flex items-center justify-between shrink-0">
                
                {/* Título e Status */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BrainCircuit className="text-purple-600" /> Life OS AI
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">Conectado a todos os seus dados locais.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Monitor de Memória */}
                    <div className="hidden md:block w-48 space-y-1">
                        <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                            <span>{memoryWarning}</span>
                            <span className={memoryPercentage > 80 ? "text-red-500 font-bold" : "text-zinc-500"}>{memoryPercentage}%</span>
                        </div>
                        {/* Componente Progress corrigido */}
                        <Progress 
                            value={memoryPercentage} 
                            className="h-1.5 bg-zinc-200 dark:bg-zinc-800" 
                            indicatorClassName={memoryColor}
                        />
                    </div>

                    {/* Botão de Nova Conversa (Clear Chat) */}
                    {chatID && (
                        <form action={clearChat.bind(null, chatID)}>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50/50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Nova Conversa
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* --- ÁREA DE CHAT (Ocupa o Restante do Espaço) --- */}
            <div className="flex-1 min-h-0"> 
                 <ChatInterface 
                    initialChatId={chatID} 
                    initialMessages={initialMessages} 
                 />
            </div>
        </div>
    );
}