"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    Send, 
    Loader2, 
    Bot, 
    User, 
    Sparkles, 
    TrendingUp, 
    Wallet, 
    CheckCircle2, 
    ArrowUp,
    Zap,
    Cloud,
    HardDrive,
    LucideIcon
} from "lucide-react";
import { sendMessage } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { MessageResponse } from "@/types/ai"; // Certifique-se que o tipo MessageResponse no arquivo types/ai.d.ts tenha provider?: string

// Tipo local estendido para garantir o campo provider
type Message = MessageResponse & { provider?: string | null };

interface ProviderStyle {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
}

// --- CONFIGURAÇÃO VISUAL ---
const PROVIDER_STYLES: Record<string, ProviderStyle> = {
    ollama: {
        label: "Ollama",
        icon: HardDrive, 
        color: "text-zinc-700 dark:text-zinc-400",
        bgColor: "bg-zinc-100 dark:bg-zinc-800",
        borderColor: "border-zinc-200 dark:border-zinc-700"
    },
    openai: {
        label: "GPT-4",
        icon: Bot, 
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
        borderColor: "border-emerald-200 dark:border-emerald-800"
    },
    groq: {
        label: "Groq",
        icon: Zap, 
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/40",
        borderColor: "border-orange-200 dark:border-orange-800"
    },
    google: {
        label: "Gemini",
        icon: Sparkles, 
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/40",
        borderColor: "border-blue-200 dark:border-blue-800"
    },
    // Fallback para mensagens de erro do sistema
    system: {
        label: "Sistema",
        icon: Bot,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/40",
        borderColor: "border-red-200 dark:border-red-800"
    }
};

const QUICK_PROMPTS = [
    { label: "Resumo Financeiro", icon: Wallet, prompt: "Como estão minhas finanças hoje? Tenho gastos recentes?", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Prioridades do Dia", icon: CheckCircle2, prompt: "Baseado nas minhas tarefas e prazos, o que devo focar agora?", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Análise de Saúde", icon: TrendingUp, prompt: "Analise meu último peso e treino. Estou no caminho certo?", color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30" },
    { label: "Planejar Rotina", icon: Sparkles, prompt: "Crie um plano para meu dia considerando minha agenda e tarefas.", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
];

export function ChatInterface({ 
    initialChatId, 
    initialMessages = [],
    provider = "ollama",
    model
}: { 
    initialChatId?: string, 
    initialMessages?: Message[],
    provider?: string,
    model?: string
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [chatId, setChatId] = useState(initialChatId);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    // Estilo da IA ATUALMENTE SELECIONADA (Para o input e empty state)
    const currentSelectionStyle = PROVIDER_STYLES[provider] || PROVIDER_STYLES.ollama;
    const CurrentIcon = currentSelectionStyle.icon;

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const tempUserMsg: Message = {
            id: Date.now().toString(),
            chatId: chatId || "temp",
            role: "user",
            content: text,
            createdAt: new Date()
        };
        
        setMessages(prev => [...prev, tempUserMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await sendMessage(chatId, text); 

            if (response.success && response.message) {
                setMessages(prev => {
                    const newMessages = prev.filter(msg => msg.id !== tempUserMsg.id);
                    return [...newMessages, response.message as Message];
                });
                
                if (!chatId && response.chatId) {
                    setChatId(response.chatId);
                    window.history.pushState({}, '', `/ai?id=${response.chatId}`);
                }
            } else {
                const errorMsg: Message = {
                    id: Date.now().toString() + 'err',
                    chatId: chatId || "temp",
                    role: "assistant",
                    content: response.error || "Erro ao processar.",
                    createdAt: new Date(),
                    provider: "system"
                }
                 setMessages(prev => {
                    const newMessages = prev.filter(msg => msg.id !== tempUserMsg.id); 
                    return [...newMessages, errorMsg];
                });
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(input);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 relative overflow-hidden">
            
            {/* MARCA D'ÁGUA (Da IA Selecionada no Momento) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <CurrentIcon 
                    className={cn(
                        "w-[400px] h-[400px] opacity-[0.03] dark:opacity-[0.02] -rotate-12 transition-colors duration-700", 
                        currentSelectionStyle.color
                    )} 
                />
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-10">
                <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-4">
                    
                    {/* Empty State */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="relative">
                                <div className={cn("absolute inset-0 blur-3xl opacity-20 rounded-full animate-pulse", currentSelectionStyle.bgColor.replace("bg-", "bg-"))}></div>
                                <div className={cn("p-6 rounded-3xl shadow-xl ring-1 relative transition-colors duration-500", currentSelectionStyle.bgColor, currentSelectionStyle.borderColor)}>
                                    <CurrentIcon className={cn("h-10 w-10", currentSelectionStyle.color)} />
                                </div>
                            </div>
                            <div className="space-y-2 max-w-md">
                                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Olá, Luiz.</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    Estou usando o cérebro <span className={cn("font-bold", currentSelectionStyle.color)}>{currentSelectionStyle.label}</span>.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                {QUICK_PROMPTS.map((item, idx) => (
                                    <button key={idx} onClick={() => handleSend(item.prompt)} className="flex flex-col items-start gap-3 p-4 text-left text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:shadow-md hover:scale-[1.02] transition-all group">
                                        <div className={cn("p-2 rounded-lg", item.color)}><item.icon className="h-4 w-4" /></div>
                                        <span className="text-zinc-600 dark:text-zinc-300 font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LISTA DE MENSAGENS (Renderização Inteligente) */}
                    {messages.map((msg) => {
                        // ✅ LÓGICA MÁGICA:
                        // Se a mensagem tem um 'provider' salvo no banco, usa o estilo dele.
                        // Se for uma mensagem antiga (sem provider) ou do usuário, usa o padrão/atual.
                        const msgProvider = msg.provider || "ollama"; 
                        const style = PROVIDER_STYLES[msgProvider] || PROVIDER_STYLES.ollama;
                        const MsgIcon = style.icon;

                        return (
                            <div 
                                key={msg.id} 
                                className={cn(
                                    "flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-4 duration-300 relative",
                                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                {/* Avatar */}
                                <Avatar className={cn(
                                    "h-9 w-9 border shadow-sm mt-1 shrink-0 transition-colors duration-300", 
                                    msg.role === "assistant" 
                                        ? cn(style.bgColor, style.borderColor) // Usa a cor DAQUELA mensagem
                                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                )}>
                                    {msg.role === "assistant" ? (
                                        <AvatarFallback className={cn("bg-transparent", style.color)}>
                                            <MsgIcon className="h-5 w-5" />
                                        </AvatarFallback>
                                    ) : (
                                        <AvatarFallback><User className="h-5 w-5 text-zinc-600 dark:text-zinc-400" /></AvatarFallback>
                                    )}
                                </Avatar>

                                {/* Balão */}
                                <div className={cn(
                                    "flex flex-col max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-7 transition-colors duration-300",
                                    msg.role === "user" 
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-black rounded-tr-none" 
                                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200 dark:border-zinc-800"
                                )}>
                                    {msg.role === "assistant" ? (
                                        <div className={cn(
                                            "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-zinc-900 dark:prose-strong:text-white",
                                            // Títulos com a cor da IA específica
                                            `prose-headings:${style.color.split(" ")[0]} dark:prose-headings:${style.color.split(" ")[1]}`
                                        )}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            
                                            {/* Tag discreta mostrando quem gerou a msg (Opcional, mas útil) */}
                                            <div className="mt-2 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-1", style.color)}>
                                                    <MsgIcon className="h-3 w-3" /> {style.label}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading Indicator (Usa o estilo da IA ATUALMENTE SELECIONADA) */}
                    {isLoading && (
                        <div className="flex gap-4 w-full animate-in fade-in">
                            <Avatar className={cn("h-9 w-9 border shadow-sm mt-1", currentSelectionStyle.bgColor, currentSelectionStyle.borderColor)}>
                                <AvatarFallback className={cn("bg-transparent", currentSelectionStyle.color)}>
                                    <CurrentIcon className="h-5 w-5 animate-pulse" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-5 py-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit">
                                <span className={cn("w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]", currentSelectionStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                                <span className={cn("w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]", currentSelectionStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                                <span className={cn("w-2 h-2 rounded-full animate-bounce", currentSelectionStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                            </div>
                        </div>
                    )}
                    
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* --- INPUT AREA --- */}
            <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black dark:to-transparent pt-10 z-20">
                <div className="max-w-3xl mx-auto relative">
                    <div className="flex justify-center mb-2">
                        <span className={cn(
                            "text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border bg-white/80 dark:bg-black/80 backdrop-blur shadow-sm transition-colors duration-500 flex items-center gap-1.5",
                            currentSelectionStyle.color,
                            currentSelectionStyle.borderColor
                        )}>
                            <CurrentIcon className="w-3 h-3" />
                            {currentSelectionStyle.label}
                        </span>
                    </div>

                    <div className={cn(
                        "flex items-end gap-2 bg-white dark:bg-zinc-900 border rounded-2xl p-2 shadow-lg shadow-zinc-200/50 dark:shadow-black/50 transition-all",
                        "focus-within:ring-2 focus-within:ring-opacity-30",
                        currentSelectionStyle.borderColor,
                        `focus-within:ring-${currentSelectionStyle.color.split("-")[1]}-500`
                    )}>
                        <Textarea 
                            placeholder={`Pergunte ao ${currentSelectionStyle.label.split(" ")[0]}...`} 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="flex-1 min-h-[48px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-3 text-base text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                            rows={1}
                        />
                        <Button 
                            size="icon" 
                            onClick={() => handleSend(input)}
                            disabled={isLoading || !input.trim()}
                            className={cn(
                                "h-10 w-10 mb-1 rounded-xl transition-all shrink-0",
                                input.trim() 
                                    ? "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-md hover:scale-105" 
                                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}