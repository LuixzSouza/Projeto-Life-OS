import { prisma } from "@/lib/prisma";
import { ChatInterface } from "@/components/ai/chat-interface";
import { BrainCircuit, Sparkles, Cloud, Cpu, Zap, Trash2, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ai/model-selector";
import { Button } from "@/components/ui/button";
import { clearChat } from "./actions";

export const dynamic = 'force-dynamic';

export default async function AIPage() {
    // 1. Carregamento de Dados Otimizado
    const [latestChat, settings] = await Promise.all([
        prisma.aiChat.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        }),
        prisma.settings.findFirst()
    ]);

    // 2. Lógica de Memória de Contexto (Tokens Estimados)
    const CONTEXT_LIMIT = 4096;
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4);
    const memoryPercentage = Math.min(Math.round((estimatedTokens / CONTEXT_LIMIT) * 100), 100);

    const getMemoryStatus = (pct: number) => {
        if (pct > 90) return { color: "bg-rose-500", text: "text-rose-500", label: "CRÍTICO" };
        if (pct > 70) return { color: "bg-amber-500", text: "text-amber-500", label: "ALTO" };
        return { color: "bg-primary", text: "text-primary", label: "OTIMIZADO" };
    };
    const status = getMemoryStatus(memoryPercentage);

    // 3. Preparação das Mensagens (Tipagem Garantida)
    const chatID = latestChat?.id;
    const initialMessages = latestChat?.messages.map(msg => ({
        id: msg.id,
        chatId: msg.chatId,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        createdAt: msg.createdAt,
    })) || [];

    const currentProvider = settings?.aiProvider || "ollama";
    const currentModel = settings?.aiModel || "llama3";
    const isLocal = currentProvider === 'ollama';

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-2rem)] bg-background relative overflow-hidden animate-in fade-in duration-700">
            
            {/* --- HEADER TÁTICO (HUD STYLE) --- */}
            <header className="shrink-0 flex flex-col sm:flex-row items-center justify-between border-b border-border/40 bg-card/30 py-4 px-6 md:px-8 z-20 backdrop-blur-md">
                
                {/* Lado Esquerdo: Branding e Status */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-inner">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                                Cérebro Digital
                            </h1>
                            <Badge variant="outline" className="text-[8px] font-black px-1.5 h-4 border-primary/30 text-primary bg-primary/5 animate-pulse">
                                <Sparkles className="w-2 h-2 mr-1" /> LIVE
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={cn(
                                "text-[9px] px-2 h-5 font-black uppercase tracking-widest border gap-1.5", 
                                isLocal ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-blue-500/20 text-blue-500 bg-blue-500/5"
                            )}>
                                {isLocal ? <Cpu className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                                {isLocal ? 'Offline_Mode' : 'Cloud_Sync'}
                            </Badge>
                        </div>
                    </div>
                </div>
                
                {/* Lado Direito: Controles de Hardware */}
                <div className="hidden sm:flex items-center gap-6">
                    <ModelSelector currentProvider={currentProvider} currentModel={currentModel} />
                    
                    <div className="h-8 w-px bg-border/40" />
                    
                    {/* Barra de Memória Estilizada */}
                    <div className="flex flex-col items-end w-32 gap-1.5">
                         <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Contexto</span>
                            <span className={status.text}>{memoryPercentage}%</span>
                         </div>
                         <div className="relative w-full h-1 bg-muted/30 rounded-full overflow-hidden border border-border/20">
                            <div 
                                className={cn("h-full transition-all duration-1000 ease-in-out", status.color)} 
                                style={{ width: `${memoryPercentage}%` }} 
                            />
                         </div>
                    </div>

                    {/* Botão de Limpeza Tático */}
                    {chatID && (
                        <form action={clearChat.bind(null, chatID)}>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                title="Limpar Memória de Curto Prazo"
                             >
                                <Trash2 className="h-4 w-4" />
                             </Button>
                        </form>
                    )}
                </div>
            </header>

            {/* --- ÁREA DE COMANDO (CHAT) --- */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                 {/* Overlay de Grid de Fundo Sutil (Estética HUD) */}
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                 
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