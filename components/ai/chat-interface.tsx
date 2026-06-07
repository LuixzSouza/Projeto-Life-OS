"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    ArrowUp, Bot, Sparkles, Zap, Cloud, HardDrive,
    LucideIcon, Wallet, TrendingUp, CheckCircle2, Cpu,
    AlertTriangle, Settings, ExternalLink, Calendar, BookOpen, Film, Users, Box, Activity,
    Plus, Pencil, Trash2, ArrowRight, Copy, Check
} from "lucide-react";
import Link from "next/link";
import { sendMessage } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MessageResponse } from "@/types/ai";
import { AI_CAPABILITIES, moduleInfo, type AiStatus } from "@/lib/ai-help";

// Mapa de ícones das capacidades (onboarding).
const CAP_ICONS: Record<string, LucideIcon> = {
    wallet: Wallet, check: CheckCircle2, calendar: Calendar, activity: Activity,
    book: BookOpen, film: Film, users: Users, box: Box,
};

// Estilo dos cards de ação (o que a IA criou/editou/apagou no turno).
const ACTION_META: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
    CREATE: { label: "Criado", icon: Plus, cls: "bg-emerald-500/10 text-emerald-600" },
    UPDATE: { label: "Atualizado", icon: Pencil, cls: "bg-blue-500/10 text-blue-600" },
    DELETE: { label: "Removido", icon: Trash2, cls: "bg-rose-500/10 text-rose-500" },
};

export type Message = MessageResponse & { provider?: string | null };

// --- 1. CONFIGURAÇÃO VISUAL TÁTICA (BLINDADA CONTRA PURGE) ---
interface ProviderStyle {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    ringColor: string; // 🟢 Adicionado explicitamente para o Tailwind não apagar no Build
    label: string;
}

const PROVIDER_STYLES: Record<string, ProviderStyle> = {
    ollama: {
        label: "Local", icon: HardDrive, 
        color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800/50",
        borderColor: "border-zinc-200 dark:border-zinc-700/50", ringColor: "focus-within:ring-zinc-500/30"
    },
    openai: {
        label: "GPT-4", icon: Cloud, 
        color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
        borderColor: "border-emerald-200 dark:border-emerald-800/40", ringColor: "focus-within:ring-emerald-500/30"
    },
    groq: {
        label: "Groq", icon: Zap, 
        color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/20",
        borderColor: "border-orange-200 dark:border-orange-800/40", ringColor: "focus-within:ring-orange-500/30"
    },
    google: {
        label: "Gemini", icon: Sparkles, 
        color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20",
        borderColor: "border-blue-200 dark:border-blue-800/40", ringColor: "focus-within:ring-blue-500/30"
    },
    system: {
        label: "Sistema", icon: Bot,
        color: "text-rose-500", bgColor: "bg-rose-50 dark:bg-rose-950/20",
        borderColor: "border-rose-200 dark:border-rose-800/40", ringColor: "focus-within:ring-rose-500/30"
    }
};

const QUICK_PROMPTS = [
    { label: "Resumo Financeiro", icon: Wallet, prompt: "Analise minhas finanças recentes. Quanto gastei este mês?", color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Prioridades do Dia", icon: CheckCircle2, prompt: "O que devo priorizar hoje baseado na minha agenda?", color: "text-blue-500 bg-blue-500/10" },
    { label: "Análise de Saúde", icon: TrendingUp, prompt: "Analise meu último peso e treino. Estou no caminho certo?", color: "text-rose-500 bg-rose-500/10" },
    { label: "Planejar Rotina", icon: Sparkles, prompt: "Crie um plano para meu dia considerando minha agenda.", color: "text-amber-500 bg-amber-500/10" },
];

/* -------------------------------------------------------------------------------------------------
 * CONTEÚDO DA RESPOSTA DO ASSISTENTE (com efeito de digitação)
 * Revela o texto progressivamente quando `animate` é true; os cards de ação só
 * aparecem ao terminar. Respeita prefers-reduced-motion. Sem mudança no backend.
 * -----------------------------------------------------------------------------------------------*/
function AssistantContent({
    message, style, animate, onProgress, onDone,
}: {
    message: Message;
    style: ProviderStyle;
    animate: boolean;
    onProgress: () => void;
    onDone: () => void;
}) {
    const text = message.content || "";
    const [count, setCount] = useState(animate ? 0 : text.length);

    useEffect(() => {
        if (!animate) { setCount(text.length); return; }
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !text) { setCount(text.length); return; }

        setCount(0);
        // Passo proporcional: qualquer tamanho de texto leva ~2s para revelar.
        const step = Math.max(2, Math.ceil(text.length / 120));
        const id = setInterval(() => {
            setCount((c) => {
                const next = Math.min(c + step, text.length);
                if (next >= text.length) clearInterval(id);
                return next;
            });
            onProgress();
        }, 16);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animate, text]);

    const done = !animate || count >= text.length;

    // Avisa o pai quando a digitação termina (libera os cards / próximo input).
    useEffect(() => {
        if (animate && done) onDone();
    }, [animate, done, onDone]);

    const visible = animate ? text.slice(0, count) : text;
    const showCards = done && message.actions && message.actions.length > 0;

    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    }, [text]);

    return (
        <>
            {/* Copiar resposta (aparece ao passar o mouse na bolha) */}
            {done && text && (
                <button
                    type="button"
                    onClick={copy}
                    title="Copiar resposta"
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover/msg:opacity-100"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            )}

            {visible && (
                <div className={cn(
                    "prose prose-sm dark:prose-invert max-w-none overflow-x-auto",
                    "prose-p:my-2 prose-headings:my-3 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider",
                    "prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800/50 prose-pre:shadow-inner",
                    "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none",
                    "prose-strong:font-black",
                    "prose-table:text-xs prose-th:bg-muted/50 prose-td:border-border/40 prose-th:border-border/40",
                    `prose-headings:${style.color.split(" ")[0]} dark:prose-headings:${style.color.split(" ")[1]}`
                )}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                                    {children}
                                </a>
                            ),
                        }}
                    >
                        {visible}
                    </ReactMarkdown>
                </div>
            )}

            {/* Cursor piscante enquanto digita */}
            {!done && (
                <span className={cn("ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-sm align-middle", style.color.replace("text-", "bg-"))} />
            )}

            {/* Cards do que a IA realmente fez no sistema (link direto). */}
            {showCards && (
                <div className={cn("flex flex-col gap-2", visible && "mt-3")}>
                    {message.actions!.map((a, i) => {
                        const meta = ACTION_META[a.action] ?? ACTION_META.UPDATE;
                        const MetaIcon = meta.icon;
                        const info = moduleInfo(a.module);
                        return (
                            <Link
                                key={i}
                                href={a.href}
                                className="group flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-2 no-underline transition-colors hover:border-primary/40 hover:bg-accent/40 animate-in fade-in slide-in-from-bottom-1 duration-300"
                            >
                                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.cls)}>
                                    <MetaIcon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                        {meta.label} · {info.name}
                                    </span>
                                    <span className="block truncate text-xs font-bold text-foreground">{a.label}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/* -------------------------------------------------------------------------------------------------
 * 2. COMPONENTE PRINCIPAL
 * -----------------------------------------------------------------------------------------------*/

interface ChatInterfaceProps {
    initialChatId?: string;
    initialMessages?: Message[];
    provider?: string;
    model?: string;
    aiStatus?: AiStatus;
}

export function ChatInterface({
    initialChatId,
    initialMessages = [],
    provider = "ollama",
    aiStatus
}: ChatInterfaceProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [chatId, setChatId] = useState<string | undefined>(initialChatId);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    // Id da mensagem que está sendo "digitada" (efeito typewriter). Só a recém-chegada anima.
    const [animatingId, setAnimatingId] = useState<string | null>(null);
    
    // Identificador robusto de provider
    const getStyle = (p: string = "ollama"): ProviderStyle => {
        const key = Object.keys(PROVIDER_STYLES).find(k => p.toLowerCase().includes(k)) || 'ollama';
        return PROVIDER_STYLES[key];
    };

    const currentStyle = getStyle(provider);
    const CurrentIcon = currentStyle.icon;

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll elegante
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isLoading]);

    // Callbacks estáveis para o efeito de digitação (evita re-render do timer).
    const scrollToEnd = useCallback(() => {
        scrollRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, []);
    const clearAnimating = useCallback(() => setAnimatingId(null), []);

    // Auto-resize do textarea (limitado a 200px)
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
                const incoming = response.message as Message;
                setMessages(prev => {
                    const filtered = prev.filter(msg => msg.id !== tempUserMsg.id);
                    return [...filtered, tempUserMsg, incoming];
                });
                // Dispara o efeito de digitação só para esta resposta recém-chegada.
                setAnimatingId(incoming.id);

                if (!chatId && response.chatId) {
                    setChatId(response.chatId);
                    // Sincroniza a URL (deep-link) e atualiza a sidebar de conversas.
                    router.replace(`/ai?id=${response.chatId}`, { scroll: false });
                }
            } else {
                const errorMsg: Message = {
                    id: Date.now().toString() + 'err',
                    chatId: chatId || "temp",
                    role: "assistant",
                    content: response.error || "Sistemas Inoperantes. Falha de Conexão.",
                    createdAt: new Date(),
                    provider: "system"
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch {
            toast.error("Erro crítico na comunicação neural.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(input);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 relative">

            {/* MARCA D'ÁGUA DE FUNDO */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <CurrentIcon className={cn("w-[400px] h-[400px] opacity-[0.02] dark:opacity-[0.03] -rotate-12 transition-colors duration-1000", currentStyle.color)} />
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 scroll-smooth z-10 space-y-6">
                
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">

                        {aiStatus && !aiStatus.configured ? (
                            /* ----- NÃO CONECTADA: passo a passo claro ----- */
                            <div className="w-full max-w-lg px-4 space-y-5">
                                <div className="relative inline-flex mx-auto">
                                    <div className="absolute inset-0 blur-3xl opacity-30 rounded-full animate-pulse bg-amber-500/30" />
                                    <div className="relative p-6 rounded-[2rem] shadow-2xl ring-1 backdrop-blur-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                                        <AlertTriangle className="h-12 w-12 text-amber-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground">IA não conectada</h3>
                                    <p className="text-sm text-muted-foreground">{aiStatus.reason}</p>
                                </div>
                                <div className="text-left bg-card border border-border/50 rounded-2xl p-5 space-y-3 shadow-sm">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Para ativar</p>
                                    <p className="text-sm text-foreground/90">{aiStatus.setup}</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90">
                                            <Settings className="h-4 w-4" /> Abrir Configurações
                                        </Link>
                                        {aiStatus.getKeyUrl && (
                                            <a href={aiStatus.getKeyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2 text-xs font-bold text-foreground transition hover:bg-accent/50">
                                                <ExternalLink className="h-4 w-4" /> Gerar API Key
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ----- CONECTADA: estado operante + atalhos ----- */
                            <>
                                <div className="relative">
                                    <div className={cn("absolute inset-0 blur-3xl opacity-30 rounded-full animate-pulse", currentStyle.bgColor)} />
                                    <div className={cn("relative p-6 rounded-[2rem] shadow-2xl ring-1 transition-colors duration-500 backdrop-blur-md", currentStyle.bgColor, currentStyle.borderColor)}>
                                        <CurrentIcon className={cn("h-12 w-12", currentStyle.color)} />
                                    </div>
                                </div>
                                <div className="space-y-2 max-w-md px-4">
                                    <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground">Sistemas Operantes</h3>
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                                        Conectado via protocolo <span className={cn("font-black", currentStyle.color)}>{currentStyle.label}</span>.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                    {QUICK_PROMPTS.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(item.prompt)}
                                            className="flex flex-col items-start gap-3 p-4 text-left bg-card hover:bg-accent/50 border border-border/40 rounded-[1.5rem] transition-all duration-300 hover:border-primary/50 hover:shadow-lg group"
                                        >
                                            <div className={cn("p-2.5 rounded-xl shadow-sm", item.color)}>
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <span className="font-black text-[10px] uppercase tracking-widest text-foreground/80 group-hover:text-foreground">
                                                {item.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ----- O QUE DÁ PRA FAZER (capacidades centralizadas) ----- */}
                        <div className="w-full max-w-2xl px-4">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">O que eu posso gerenciar</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {AI_CAPABILITIES.map((cap) => {
                                    const Icon = CAP_ICONS[cap.icon] ?? Sparkles;
                                    const enabled = !aiStatus || aiStatus.configured;
                                    return (
                                        <button
                                            key={cap.area}
                                            type="button"
                                            disabled={!enabled}
                                            onClick={() => enabled && handleSend(cap.example)}
                                            title={`${cap.can} — ex.: "${cap.example}"`}
                                            className={cn(
                                                "flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-left transition-all",
                                                enabled ? "hover:border-primary/40 hover:bg-accent/40 cursor-pointer" : "opacity-60 cursor-default"
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                                            <span className="truncate text-[11px] font-bold text-foreground/80">{cap.area}</span>
                                        </button>
                                    );
                                })}
                            </div>
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
                                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500",
                                isUser ? "justify-end" : "justify-start"
                            )}
                        >
                            {!isUser && (
                                <Avatar className={cn("h-8 w-8 mt-1 border shadow-md shrink-0", style.bgColor, style.borderColor)}>
                                    <AvatarFallback className="bg-transparent">
                                        <MsgIcon className={cn("h-4 w-4", style.color)} />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div className={cn(
                                "relative px-5 py-4 max-w-[85%] md:max-w-[75%] text-sm leading-relaxed shadow-sm",
                                isUser
                                    ? "bg-foreground text-background rounded-3xl rounded-tr-sm font-medium"
                                    : cn(
                                        "group/msg rounded-3xl rounded-tl-sm border bg-background/95 backdrop-blur-sm",
                                        style.borderColor
                                    )
                            )}>
                                {isUser ? (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <AssistantContent
                                        message={msg}
                                        style={style}
                                        animate={msg.id === animatingId}
                                        onProgress={scrollToEnd}
                                        onDone={clearAnimating}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex w-full gap-3 animate-in fade-in zoom-in duration-300">
                        <Avatar className={cn("h-8 w-8 mt-1 border shadow-sm", currentStyle.bgColor, currentStyle.borderColor)}>
                            <AvatarFallback className="bg-transparent">
                                <CurrentIcon className={cn("h-4 w-4 animate-spin", currentStyle.color)} />
                            </AvatarFallback>
                        </Avatar>
                        <div className="bg-background/95 border border-border/40 px-5 py-4 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]", currentStyle.color.replace("text-", "bg-"))} />
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]", currentStyle.color.replace("text-", "bg-"))} />
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", currentStyle.color.replace("text-", "bg-"))} />
                        </div>
                    </div>
                )}
                
                <div ref={scrollRef} className="h-1" />
            </div>

            {/* --- INPUT FLUTUANTE (em fluxo: não cobre as mensagens, mas mantém o visual) --- */}
            <div className="shrink-0 relative z-20">
                <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent" />
                <div className="relative p-4 md:p-6 pt-3 max-w-3xl mx-auto">
                    
                    <div className="flex justify-center mb-3">
                        <span className={cn(
                            "text-[9px] uppercase font-black tracking-[0.2em] px-3 py-1.5 rounded-full border bg-background/80 backdrop-blur-md shadow-sm transition-colors duration-500 flex items-center gap-2",
                            currentStyle.color, currentStyle.borderColor
                        )}>
                            <CurrentIcon className="w-3 h-3" />
                            {currentStyle.label}
                        </span>
                    </div>

                    <div className={cn(
                        "relative flex items-end gap-2 bg-background/80 backdrop-blur-xl border rounded-[2rem] p-2 shadow-2xl transition-all duration-300",
                        "focus-within:ring-2 focus-within:ring-opacity-20",
                        currentStyle.borderColor,
                        currentStyle.ringColor
                    )}>
                        <Textarea 
                            ref={textareaRef}
                            placeholder={`Comando para ${currentStyle.label.split(" ")[0]}...`} 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="flex-1 min-h-[44px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4 text-sm placeholder:text-muted-foreground/50 font-medium"
                            rows={1}
                        />
                        <div className="pb-1 pr-1 shrink-0">
                            <Button 
                                size="icon" 
                                onClick={() => handleSend(input)}
                                disabled={isLoading || !input.trim()}
                                className={cn(
                                    "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                    input.trim() 
                                        ? "bg-primary text-primary-foreground hover:scale-105 shadow-primary/20" 
                                        : "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
                                )}
                            >
                                {isLoading ? <Cpu className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-center text-muted-foreground/40 mt-3">
                        Respostas geradas por inteligência artificial. Sujeito a alucinações.
                    </div>
                </div>
            </div>
        </div>
    );
}