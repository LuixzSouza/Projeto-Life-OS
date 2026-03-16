import { prisma } from "@/lib/prisma";
import { ChatInterface } from "@/components/ai/chat-interface";
import { BrainCircuit, Sparkles, Cloud, Cpu, Trash2, Activity, Zap, HardDrive, Box, Wind, CalendarClock, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ai/model-selector";
import { DeleteChatForm } from "../../../components/ai/delete-chat-form"; // Criaremos este pequeno componente a seguir

export const dynamic = 'force-dynamic';

export default async function AIPage() {
    // 1. Carregamento de Dados
    const [latestChat, settings] = await Promise.all([
        prisma.aiChat.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        }),
        prisma.settings.findFirst()
    ]);

    const currentProvider = settings?.aiProvider || "ollama";
    const currentModel = settings?.aiModel || "llama3";
    const isLocal = currentProvider === 'ollama';

    // 2. Lógica Dinâmica de Memória (Contexto da IA Atual)
    const getContextLimit = (provider: string, model: string) => {
        if (provider === 'google') return 1048576; // Gemini: 1 Milhão de Tokens
        if (provider === 'openai' && model.includes('gpt-4')) return 128000;
        if (provider === 'openai') return 16384;
        if (provider === 'deepseek') return 64000;
        if (provider === 'mistral') return 32000;
        return 8192; // Groq e Ollama Padrão
    };

    const CONTEXT_LIMIT = getContextLimit(currentProvider, currentModel);
    
    // Estimativa de tokens da conversa atual
    const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4);
    const memoryPercentage = Math.min(Math.round((estimatedTokens / CONTEXT_LIMIT) * 100), 100);

    const getMemoryStatus = (pct: number) => {
        if (pct > 90) return { color: "bg-rose-500", text: "text-rose-500", label: "CRÍTICO" };
        if (pct > 70) return { color: "bg-amber-500", text: "text-amber-500", label: "ALTO" };
        return { color: "bg-emerald-500", text: "text-emerald-500", label: "ESTÁVEL" };
    };
    const status = getMemoryStatus(memoryPercentage);

    // 3. Leitura de Uso Mensal (API Quotas)
    let usage: Record<string, number | string> = {};
    try {
        usage = settings?.aiUsage ? JSON.parse(settings.aiUsage as string) : {};
    } catch (e) {
        usage = {};
    }
    
    const monthlyTokensUsed = Number(usage[currentProvider]) || 0;
    const lastResetStr = String(usage.lastReset || new Date().toISOString());
    const lastResetDate = new Date(lastResetStr);
    
    // Próxima renovação: Dia 1º do mês seguinte
    const nextRenewal = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth() + 1, 1);
    const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    // 4. Preparação das Mensagens (RESOLVE O BUG DO DESIGN VISUAL)
    const chatID = latestChat?.id;
    const initialMessages = latestChat?.messages.map(msg => ({
        id: msg.id,
        chatId: msg.chatId,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        createdAt: msg.createdAt,
        provider: msg.provider, // <-- ISSO AQUI FAZ AS CORES ANTIGAS FUNCIONAREM
        model: msg.model
    })) || [];

    // Helper para o Ícone Principal
    const ProviderIcon = 
        currentProvider === 'groq' ? Zap :
        currentProvider === 'openai' ? Cloud :
        currentProvider === 'google' ? Sparkles :
        currentProvider === 'deepseek' ? Brain :
        currentProvider === 'mistral' ? Wind : HardDrive;

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
                                LIVE
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={cn(
                                "text-[9px] px-2 h-5 font-black uppercase tracking-widest border gap-1.5", 
                                isLocal ? "border-zinc-500/20 text-zinc-500 bg-zinc-500/5" : "border-primary/20 text-primary bg-primary/5"
                            )}>
                                <ProviderIcon className="w-3 h-3" />
                                {currentProvider}
                            </Badge>
                        </div>
                    </div>
                </div>
                
                {/* Lado Direito: Controles e Telemetria */}
                <div className="hidden sm:flex items-center gap-5">
                    
                    {/* Telemetria do Provedor (Uso Mensal e Renovação) */}
                    {!isLocal && (
                        <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/30 border border-border/40 rounded-full mr-2">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">Consumo Mensal</span>
                                <span className="text-xs font-mono font-bold text-foreground">
                                    {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(monthlyTokensUsed)} <span className="text-[9px]">TKN</span>
                                </span>
                            </div>
                            <div className="h-6 w-px bg-border/50" />
                            <div className="flex items-center gap-1.5 text-muted-foreground" title={`Renova dia 1º. Faltam ${daysUntilRenewal} dias.`}>
                                <CalendarClock className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest">Renovação</span>
                                    <span className="text-[9px] font-bold">{daysUntilRenewal} dias</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <ModelSelector currentProvider={currentProvider} currentModel={currentModel} />
                    
                    <div className="h-8 w-px bg-border/40" />
                    
                    {/* Barra de Memória da Conversa Atual */}
                    <div className="flex flex-col items-end w-32 gap-1.5" title={`Limite desta IA: ${CONTEXT_LIMIT} tokens`}>
                         <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Contexto</span>
                            <span className={status.text}>{memoryPercentage}%</span>
                         </div>
                         <div className="relative w-full h-1.5 bg-muted/50 rounded-full overflow-hidden border border-border/20">
                            <div 
                                className={cn("absolute top-0 left-0 h-full transition-all duration-1000 ease-out", status.color)} 
                                style={{ width: `${memoryPercentage}%` }} 
                            />
                         </div>
                    </div>

                    {/* Botão de Limpeza Tático (Agora é um Componente Cliente) */}
                    {chatID && <DeleteChatForm chatId={chatID} />}
                </div>
            </header>

            {/* --- ÁREA DE COMANDO (CHAT) --- */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
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