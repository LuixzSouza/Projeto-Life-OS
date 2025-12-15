"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    ArrowUp, 
    Bot, 
    User, 
    Sparkles, 
    Zap,
    Cloud,
    HardDrive,
    LucideIcon,
    Wallet,
    TrendingUp,
    CheckCircle2,
    Cpu
} from "lucide-react";
import { sendMessage } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { MessageResponse } from "@/types/ai"; 

type Message = MessageResponse & { provider?: string | null };

interface ProviderStyle {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
}

// --- 1. CONFIGURAÇÃO VISUAL COLORIDA (RESTAURADA) ---
const PROVIDER_STYLES: Record<string, ProviderStyle> = {
    ollama: {
        label: "Local",
        icon: HardDrive, 
        color: "text-zinc-600 dark:text-zinc-400",
        bgColor: "bg-zinc-100 dark:bg-zinc-800",
        borderColor: "border-zinc-200 dark:border-zinc-700"
    },
    openai: {
        label: "GPT-4",
        icon: Cloud, 
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        borderColor: "border-emerald-200 dark:border-emerald-800"
    },
    groq: {
        label: "Groq",
        icon: Zap, 
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800"
    },
    google: {
        label: "Gemini",
        icon: Sparkles, 
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800"
    },
    system: {
        label: "Sistema",
        icon: Bot,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800"
    }
};

const QUICK_PROMPTS = [
    { label: "Resumo Financeiro", icon: Wallet, prompt: "Analise minhas finanças recentes. Quanto gastei este mês?", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Prioridades", icon: CheckCircle2, prompt: "O que devo priorizar hoje baseado na minha agenda?", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Análise de Saúde", icon: TrendingUp, prompt: "Analise meu último peso e treino. Estou no caminho certo?", color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30" },
    { label: "Planejar Rotina", icon: Sparkles, prompt: "Crie um plano para meu dia considerando minha agenda.", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
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
    
    // Fallback inteligente para providers compostos
    const getStyle = (p: string = "ollama") => {
        const key = Object.keys(PROVIDER_STYLES).find(k => p.includes(k)) || 'ollama';
        return PROVIDER_STYLES[key];
    };

    const currentStyle = getStyle(provider);
    const CurrentIcon = currentStyle.icon;

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

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
        if (textareaRef.current) textareaRef.current.style.height = "auto"; 
        setIsLoading(true);

        try {
            const response = await sendMessage(chatId, text); 

            if (response.success && response.message) {
                setMessages(prev => {
                    const filtered = prev.filter(msg => msg.id !== tempUserMsg.id);
                    return [...filtered, tempUserMsg, response.message as Message];
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
                    content: response.error || "Erro de conexão.",
                    createdAt: new Date(),
                    provider: "system"
                }
                 setMessages(prev => [...prev, errorMsg]);
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
        <div className="flex flex-col h-full relative">
            
            {/* MARCA D'ÁGUA COLORIDA (Baseada na IA atual) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <CurrentIcon className={cn("w-[400px] h-[400px] opacity-[0.03] -rotate-12 transition-colors duration-700", currentStyle.color)} />
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 scroll-smooth z-10 space-y-6">
                
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className={cn("absolute inset-0 blur-3xl opacity-20 rounded-full animate-pulse", currentStyle.bgColor.replace("bg-", "bg-"))}></div>
                            <div className={cn("relative p-6 rounded-3xl shadow-xl ring-1 transition-colors duration-500", currentStyle.bgColor, currentStyle.borderColor)}>
                                <CurrentIcon className={cn("h-10 w-10", currentStyle.color)} />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-md px-4">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">Olá, Luiz.</h3>
                            <p className="text-muted-foreground text-sm">
                                Estou conectado via <span className={cn("font-bold", currentStyle.color)}>{currentStyle.label}</span>.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                            {QUICK_PROMPTS.map((item, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => handleSend(item.prompt)} 
                                    className="flex flex-col items-start gap-2 p-4 text-left text-sm bg-card hover:bg-muted/50 border border-border rounded-xl transition-all hover:border-primary/50 hover:shadow-md group"
                                >
                                    <div className={cn("p-2 rounded-lg", item.color)}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-foreground">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    const style = getStyle(msg.provider || provider);
                    const MsgIcon = style.icon;

                    return (
                        <div 
                            key={msg.id || index} 
                            className={cn(
                                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                isUser ? "justify-end" : "justify-start"
                            )}
                        >
                            {!isUser && (
                                <Avatar className={cn("h-8 w-8 mt-1 border shadow-sm shrink-0", style.bgColor, style.borderColor)}>
                                    <AvatarFallback className="bg-transparent">
                                        <MsgIcon className={cn("h-4 w-4", style.color)} />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            {/* Balão de Mensagem (COLORIDO PARA IA, PRETO/BRANCO PARA USER) */}
                            <div className={cn(
                                "relative px-5 py-3.5 max-w-[85%] md:max-w-[75%] text-sm leading-relaxed shadow-sm",
                                isUser 
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl rounded-tr-sm" 
                                    : cn(
                                        "rounded-2xl rounded-tl-sm border",
                                        "bg-white dark:bg-zinc-900", // Fundo base
                                        style.borderColor // Borda colorida sutil
                                    )
                            )}>
                                {isUser ? (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <div className={cn(
                                        "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2",
                                        "prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-950/50 prose-pre:border prose-pre:border-border",
                                        // Títulos ganham a cor da IA
                                        `prose-headings:${style.color.split(" ")[0]} dark:prose-headings:${style.color.split(" ")[1]}`
                                    )}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex w-full gap-3 animate-in fade-in">
                        <Avatar className={cn("h-8 w-8 mt-1 border shadow-sm", currentStyle.bgColor, currentStyle.borderColor)}>
                            <AvatarFallback className="bg-transparent">
                                <CurrentIcon className={cn("h-4 w-4 animate-pulse", currentStyle.color)} />
                            </AvatarFallback>
                        </Avatar>
                        <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]", currentStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]", currentStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", currentStyle.color.split(" ")[0].replace("text-", "bg-"))}></span>
                        </div>
                    </div>
                )}
                
                <div ref={scrollRef} />
            </div>

            {/* --- INPUT AREA (COM O BLUR QUE VOCÊ GOSTA) --- */}
            <div className="absolute bottom-0 left-0 w-full z-20">
                
                {/* O EFEITO DE FUMAÇA/BLUR */}
                <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none backdrop-blur-[2px]" />

                <div className="relative p-4 md:p-6 max-w-3xl mx-auto">
                    {/* Badge flutuante mostrando a IA atual */}
                    <div className="flex justify-center mb-2">
                        <span className={cn(
                            "text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border bg-background/80 backdrop-blur shadow-sm transition-colors duration-500 flex items-center gap-1.5",
                            currentStyle.color,
                            currentStyle.borderColor
                        )}>
                            <CurrentIcon className="w-3 h-3" />
                            {currentStyle.label}
                        </span>
                    </div>

                    <div className={cn(
                        "relative flex items-end gap-2 bg-background/80 backdrop-blur-xl border rounded-3xl p-2 shadow-2xl transition-all",
                        "focus-within:ring-2 focus-within:ring-opacity-30",
                        currentStyle.borderColor,
                        `focus-within:ring-${currentStyle.color.split("-")[1]}-500` // Tenta usar a cor da IA no ring
                    )}>
                        <Textarea 
                            ref={textareaRef}
                            placeholder={`Pergunte ao ${currentStyle.label.split(" ")[0]}...`} 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="flex-1 min-h-[44px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4 text-sm placeholder:text-muted-foreground/70"
                            rows={1}
                        />
                        <div className="pb-1 pr-1">
                            <Button 
                                size="icon" 
                                onClick={() => handleSend(input)}
                                disabled={isLoading || !input.trim()}
                                className={cn(
                                    "h-9 w-9 rounded-full transition-all duration-300 shadow-sm",
                                    input.trim() 
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105" 
                                        : "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
                                )}
                            >
                                {isLoading ? <Cpu className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground/60 mt-2">
                        Life OS AI. As respostas podem variar.
                    </div>
                </div>
            </div>
        </div>
    );
}