"use client";

import { Fragment, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    ArrowUp, ArrowDown, Bot, Sparkles, Zap, Cloud, HardDrive,
    LucideIcon, Wallet, TrendingUp, CheckCircle2, Cpu,
    AlertTriangle, Settings, ExternalLink, Calendar, BookOpen, Film, Users, Box, Activity,
    Plus, Pencil, Trash2, ArrowRight, Copy, Check, Brain, Wind, Asterisk, Orbit, Network, RotateCcw, X,
    Mic, Volume2, VolumeX, Paperclip
} from "lucide-react";
import { useSpeechInput, useVoiceReply, speakText, stopSpeaking, formatListenClock } from "@/components/ai/voice";
import { compressImageFile } from "@/lib/image";
import Link from "next/link";
import { sendMessage, regenerateResponse, editLastMessage } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MessageResponse, SendMessageResult } from "@/types/ai";
import { AI_CAPABILITIES, moduleInfo, type AiStatus } from "@/lib/ai-help";

/* -------------------------------------------------------------------------------------------------
 * STREAMING SSE (com fallback automático para a Server Action)
 * O endpoint /api/ai/chat emite: status (passo do loop), delta (texto ao vivo),
 * reset (descartar provisório), done (resultado completo) e error.
 * -----------------------------------------------------------------------------------------------*/
interface StreamAttachment { kind: "image"; dataUrl: string; name?: string }
interface StreamCallbacks {
    onDelta: (text: string) => void;
    onStatus: (label: string) => void;
    onReset: () => void;
}

async function streamChat(
    payload: { chatId?: string; message: string; attachments: StreamAttachment[] },
    cb: StreamCallbacks
): Promise<SendMessageResult> {
    const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
        throw new Error("SSE indisponível");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let result: SendMessageResult | null = null;
    let errMsg: string | null = null;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            let event = "message";
            let data = "";
            for (const line of block.split("\n")) {
                if (line.startsWith("event:")) event = line.slice(6).trim();
                else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (!data) continue;
            try {
                const parsed = JSON.parse(data) as Record<string, unknown>;
                if (event === "delta" && typeof parsed.text === "string") cb.onDelta(parsed.text);
                else if (event === "status" && typeof parsed.label === "string") cb.onStatus(parsed.label);
                else if (event === "reset") cb.onReset();
                else if (event === "done") result = parsed as unknown as SendMessageResult;
                else if (event === "error") errMsg = typeof parsed.error === "string" ? parsed.error : "Falha no streaming.";
            } catch { /* bloco malformado — ignora */ }
        }
    }

    if (errMsg) throw new Error(errMsg);
    if (!result) throw new Error("Stream terminou sem resultado.");
    return result;
}

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

export type Message = MessageResponse & { provider?: string | null; model?: string | null };

// Fila offline (#14): mensagens enviadas sem rede aguardam aqui (localStorage)
// e são despachadas em ordem quando a conexão volta.
const OFFLINE_QUEUE_KEY = "lifeos-ai-offline-queue";

// --- 1. CONFIGURAÇÃO VISUAL TÁTICA (BLINDADA CONTRA PURGE) ---
interface ProviderStyle {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    ringColor: string; // 🟢 Adicionado explicitamente para o Tailwind não apagar no Build
    label: string;
}

// Safelist do Tailwind: as classes abaixo são geradas em runtime via
// color.replace("text-","bg-") (cursor/bolinhas de digitação) — precisam
// existir literalmente no fonte para o purge do build não removê-las:
// bg-zinc-500 bg-emerald-500 bg-orange-500 bg-blue-500 bg-indigo-500
// bg-yellow-500 bg-amber-600 bg-violet-500 bg-sky-500 bg-rose-500
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
    deepseek: {
        label: "DeepSeek", icon: Brain,
        color: "text-indigo-500", bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
        borderColor: "border-indigo-200 dark:border-indigo-800/40", ringColor: "focus-within:ring-indigo-500/30"
    },
    mistral: {
        label: "Mistral", icon: Wind,
        color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
        borderColor: "border-yellow-200 dark:border-yellow-800/40", ringColor: "focus-within:ring-yellow-500/30"
    },
    anthropic: {
        label: "Claude", icon: Asterisk,
        color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/20",
        borderColor: "border-amber-200 dark:border-amber-800/40", ringColor: "focus-within:ring-amber-500/30"
    },
    xai: {
        label: "Grok", icon: Orbit,
        color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-950/20",
        borderColor: "border-violet-200 dark:border-violet-800/40", ringColor: "focus-within:ring-violet-500/30"
    },
    openrouter: {
        label: "OpenRouter", icon: Network,
        color: "text-sky-500", bgColor: "bg-sky-50 dark:bg-sky-950/20",
        borderColor: "border-sky-200 dark:border-sky-800/40", ringColor: "focus-within:ring-sky-500/30"
    },
    system: {
        label: "Sistema", icon: Bot,
        color: "text-rose-500", bgColor: "bg-rose-50 dark:bg-rose-950/20",
        borderColor: "border-rose-200 dark:border-rose-800/40", ringColor: "focus-within:ring-rose-500/30"
    }
};

/** Hora local HH:MM da mensagem (carimbo discreto sob a bolha). */
function messageTime(createdAt: Date | string | undefined): string | null {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Rótulo do separador de dia entre mensagens ("Hoje", "Ontem", "08 jun"). */
function dayLabel(d: Date): string {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    return day.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Saudação pela hora local — deixa o estado vazio pessoal, não robótico. */
function greeting(): string {
    const h = new Date().getHours();
    if (h < 6) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
}

/** Bloco de código com botão de copiar (hover) — detalhe à la Claude. */
function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
    const preRef = useRef<HTMLPreElement>(null);
    const [copied, setCopied] = useState(false);
    const copy = () => {
        const text = preRef.current?.innerText ?? "";
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };
    return (
        <div className="group/code relative">
            <button
                type="button"
                onClick={copy}
                title="Copiar código"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-900/90 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-100 group-hover/code:opacity-100"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre ref={preRef} {...props}>{children}</pre>
        </div>
    );
}

/** Ações da bolha do usuário: editar (última) + copiar. Ficam FORA da bolha
    (coluna à esquerda, centradas) para nunca cobrirem o texto. */
function UserBubbleActions({ text, onEdit }: { text: string; onEdit?: () => void }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };
    const btnCls = "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition hover:bg-muted hover:text-foreground";
    return (
        <div className="absolute right-full top-1/2 z-10 mr-1 flex -translate-y-1/2 flex-col items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100">
            {onEdit && (
                <button type="button" onClick={onEdit} title="Editar e reenviar" className={btnCls}>
                    <Pencil className="h-3 w-3" />
                </button>
            )}
            <button type="button" onClick={copy} title="Copiar mensagem" className={btnCls}>
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </button>
        </div>
    );
}

/** Rótulo do "pensando...": status REAL do loop (via SSE) ou rotativo de fallback. */
const LOADING_STEPS = ["Pensando...", "Consultando seus dados...", "Executando ações...", "Escrevendo resposta..."];
function LoadingLabel({ override }: { override?: string | null }) {
    const [step, setStep] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setStep((s) => s + 1), 2200);
        return () => clearInterval(id);
    }, []);
    return (
        <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            {override || LOADING_STEPS[Math.min(step, LOADING_STEPS.length - 1)]}
        </span>
    );
}

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
    message, style, animate, onProgress, onDone, onRegenerate, onSuggest,
}: {
    message: Message;
    style: ProviderStyle;
    animate: boolean;
    onProgress: () => void;
    onDone: () => void;
    /** Presente apenas na última resposta: gera a resposta de novo. */
    onRegenerate?: () => void;
    /** Presente apenas na última resposta: envia a sugestão clicada (chips). */
    onSuggest?: (text: string) => void;
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
    // Chips de continuação: só na última resposta (onSuggest) e após a digitação.
    const showSuggestions = done && !!onSuggest && !!message.suggestions && message.suggestions.length > 0;

    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    }, [text]);

    return (
        <>
            {/* Copiar / regenerar — FORA da bolha (coluna à direita), nunca sobre o texto */}
            {done && text && (
                <div className="absolute left-full top-1/2 z-10 ml-1 flex -translate-y-1/2 flex-col items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100">
                    {onRegenerate && (
                        <button
                            type="button"
                            onClick={onRegenerate}
                            title="Regenerar resposta"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={copy}
                        title="Copiar resposta"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                    >
                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                </div>
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
                            pre: CodeBlock,
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

            {/* Chips de follow-up: continuações de 1 toque sugeridas pela IA. */}
            {showSuggestions && (
                <div className={cn("flex flex-wrap gap-1.5", (visible || showCards) && "mt-3")}>
                    {message.suggestions!.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onSuggest!(s)}
                            className="rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary animate-in fade-in slide-in-from-bottom-1 duration-300"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            {s}
                        </button>
                    ))}
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
    /** Texto pré-preenchido no composer (deep-link ?q= — o usuário revisa e envia). */
    initialInput?: string;
    /** 1º nome do usuário — deixa a saudação do estado vazio pessoal. */
    userName?: string;
    provider?: string;
    model?: string;
    aiStatus?: AiStatus;
}

export function ChatInterface({
    initialChatId,
    initialMessages = [],
    initialInput,
    userName,
    provider = "ollama",
    aiStatus
}: ChatInterfaceProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [chatId, setChatId] = useState<string | undefined>(initialChatId);
    const [input, setInput] = useState(initialInput ?? "");
    const [isLoading, setIsLoading] = useState(false);
    // Modo edição: o composer reescreve a última mensagem em vez de enviar outra.
    const [editing, setEditing] = useState(false);
    // Id da mensagem que está sendo "digitada" (efeito typewriter). Só a recém-chegada anima.
    const [animatingId, setAnimatingId] = useState<string | null>(null);

    // Modo voz (#8): ditado (microfone) + leitura opcional das respostas.
    const dictation = useSpeechInput((spoken) => {
        setInput((prev) => (prev ? `${prev.trimEnd()} ${spoken}` : spoken));
    });
    const voiceReply = useVoiceReply();

    // Streaming SSE: texto parcial da resposta (ao vivo) + status real do loop.
    const [streamText, setStreamText] = useState("");
    const [streamStatus, setStreamStatus] = useState<string | null>(null);

    // Anexos do turno (visão): imagens comprimidas no client; arquivos de texto
    // (.txt/.md/.csv) entram inline no composer. Máx. 3 imagens por mensagem.
    const [attachments, setAttachments] = useState<{ dataUrl: string; name: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        for (const file of Array.from(files)) {
            if (file.type.startsWith("image/")) {
                if (attachments.length >= 3) { toast.error("Máximo de 3 imagens por mensagem."); break; }
                try {
                    const dataUrl = await compressImageFile(file, { maxDimension: 1280, quality: 0.8 });
                    if (dataUrl.length > 1_800_000) { toast.error(`"${file.name}" ficou grande demais mesmo comprimida.`); continue; }
                    setAttachments((prev) => prev.length >= 3 ? prev : [...prev, { dataUrl, name: file.name }]);
                } catch {
                    toast.error(`Não consegui ler a imagem "${file.name}".`);
                }
            } else if (/\.(txt|md|csv|json|log)$/i.test(file.name) || file.type.startsWith("text/")) {
                try {
                    const text = (await file.text()).slice(0, 6000);
                    setInput((prev) => `${prev ? `${prev.trimEnd()}\n\n` : ""}[Conteúdo de ${file.name}]:\n${text}`);
                } catch {
                    toast.error(`Não consegui ler "${file.name}".`);
                }
            } else {
                toast.error(`"${file.name}": envie imagens (print, recibo, prato...) ou arquivos de texto.`);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };
    
    // Identificador robusto de provider
    const getStyle = (p: string = "ollama"): ProviderStyle => {
        const key = Object.keys(PROVIDER_STYLES).find(k => p.toLowerCase().includes(k)) || 'ollama';
        return PROVIDER_STYLES[key];
    };

    const currentStyle = getStyle(provider);
    const CurrentIcon = currentStyle.icon;

    // Última resposta real da IA (bolhas de erro "system" não contam) — é a
    // única que ganha o botão de regenerar.
    const lastAssistantId = [...messages].reverse().find(m => m.role === "assistant" && m.provider !== "system")?.id;
    // Última mensagem do usuário — a única editável (edita & reenvia).
    const lastUserId = [...messages].reverse().find(m => m.role === "user")?.id;

    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Mostra o "voltar ao fim" quando o usuário rolou para cima na conversa.
    const [showJump, setShowJump] = useState(false);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
    }, []);

    const jumpToEnd = useCallback(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, []);

    // Auto-scroll elegante (acompanha também o texto streamado ao vivo)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isLoading, streamText]);

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
        // Guarda contra duplo envio (atalhos/capacidades clicáveis durante o loading).
        if ((!text.trim() && attachments.length === 0) || isLoading) return;

        // Fila offline (#14): sem rede, a mensagem espera no aparelho e é
        // despachada automaticamente quando a conexão voltar.
        if (typeof navigator !== "undefined" && !navigator.onLine && text.trim()) {
            try {
                const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]") as string[];
                queue.push(text.trim());
                localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-10)));
                setInput("");
                toast.info("Sem conexão — mensagem na fila. Envio automático quando a rede voltar.");
            } catch {
                toast.error("Sem conexão e não consegui guardar a mensagem na fila.");
            }
            return;
        }
        // Só imagem, sem texto: dá um comando padrão útil.
        const finalText = text.trim() || "Analise este anexo no contexto do meu Life OS.";
        const sentAttachments = attachments;

        const tempUserMsg: Message = {
            id: Date.now().toString(),
            chatId: chatId || "temp",
            role: "user",
            content: finalText,
            images: sentAttachments.map((a) => a.dataUrl),
            createdAt: new Date()
        };

        setMessages(prev => [...prev, tempUserMsg]);
        setInput("");
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setIsLoading(true);
        dictation.stop();
        stopSpeaking();

        const payloadAttachments = sentAttachments.map((a) => ({ kind: "image" as const, dataUrl: a.dataUrl, name: a.name }));

        try {
            // 1) Streaming SSE (tokens ao vivo). 2) Se o transporte falhar ANTES
            // de qualquer evento, cai para a Server Action (mesma lógica no servidor).
            let gotEvent = false;
            let gotDelta = false;
            let response: SendMessageResult | null = null;

            try {
                response = await streamChat(
                    { chatId, message: finalText, attachments: payloadAttachments },
                    {
                        onDelta: (t) => { gotEvent = true; gotDelta = true; setStreamText((prev) => prev + t); },
                        onStatus: (l) => { gotEvent = true; setStreamStatus(l); },
                        onReset: () => { setStreamText(""); },
                    }
                );
            } catch (streamErr) {
                if (!gotEvent) {
                    // Transporte SSE indisponível — fallback transparente.
                    response = await sendMessage(chatId, finalText, payloadAttachments);
                } else {
                    // O stream começou e quebrou no meio: reenviar duplicaria a
                    // mensagem no servidor — mostra o erro com honestidade.
                    throw streamErr;
                }
            }

            setStreamText("");
            setStreamStatus(null);

            if (response?.success && response.message) {
                const incoming = response.message as Message;
                const startedNewChat = !!response.chatId && response.chatId !== chatId;

                if (response.switched && startedNewChat) {
                    // Trocou de IA no meio da conversa: a anterior fica intacta no
                    // histórico; a tela passa a mostrar apenas a conversa nova.
                    setMessages([tempUserMsg, incoming]);
                    toast.info("Você trocou de IA — comecei uma conversa nova para não misturar contextos.");
                } else {
                    setMessages(prev => {
                        const filtered = prev.filter(msg => msg.id !== tempUserMsg.id);
                        return [...filtered, tempUserMsg, incoming];
                    });
                }
                // Typewriter só quando NÃO houve streaming real (o texto já foi
                // revelado ao vivo pelos deltas — repetir a animação seria regressão).
                setAnimatingId(gotDelta ? null : incoming.id);
                // Modo voz: lê a resposta em voz alta (se habilitado).
                if (voiceReply.enabled) speakText(incoming.content);

                if (startedNewChat && response.chatId) {
                    setChatId(response.chatId);
                    // Sincroniza a URL (deep-link) e atualiza a sidebar de conversas.
                    router.replace(`/ai?id=${response.chatId}`, { scroll: false });
                }
            } else {
                const errorMsg: Message = {
                    id: Date.now().toString() + 'err',
                    chatId: chatId || "temp",
                    role: "assistant",
                    content: response?.error || "Sistemas Inoperantes. Falha de Conexão.",
                    createdAt: new Date(),
                    provider: "system"
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch {
            setStreamText("");
            setStreamStatus(null);
            toast.error("Erro crítico na comunicação neural.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Deep-link ?q=: composer já chega preenchido — foca para revisar/enviar.
    useEffect(() => {
        if (initialInput) textareaRef.current?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fila offline (#14): despacha as mensagens guardadas quando a rede volta
    // (e na montagem, caso tenham sobrado de uma sessão anterior).
    const handleSendRef = useRef<(text: string) => Promise<void>>(async () => {});
    useEffect(() => { handleSendRef.current = handleSend; });
    useEffect(() => {
        const flush = async () => {
            if (typeof navigator !== "undefined" && !navigator.onLine) return;
            let queue: string[] = [];
            try { queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]") as string[]; } catch { queue = []; }
            if (queue.length === 0) return;
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            toast.info(`Conexão de volta — enviando ${queue.length} mensagem(ns) da fila.`);
            for (const text of queue) {
                // Sequencial de propósito: preserva a ordem da conversa.
                await handleSendRef.current(text);
            }
        };
        window.addEventListener("online", flush);
        void flush();
        return () => window.removeEventListener("online", flush);
    }, []);

    // Atalho "/" foca o composer (quando não se está digitando em outro campo).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "/") return;
            const el = document.activeElement as HTMLElement | null;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable) return;
            e.preventDefault();
            textareaRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Entra no modo edição: joga o texto da última mensagem no composer.
    const startEditing = (text: string) => {
        setEditing(true);
        setInput(text);
        textareaRef.current?.focus();
    };

    const cancelEditing = useCallback(() => {
        setEditing(false);
        setInput("");
    }, []);

    // Edita & reenvia: o servidor reescreve a última mensagem do usuário,
    // descarta as respostas dela e gera uma nova (sem duplicar nada no banco).
    const handleEditSend = async (text: string) => {
        if (!text.trim() || isLoading || !chatId) return;
        setIsLoading(true);
        setEditing(false);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        // Snapshot p/ restaurar a conversa se o reenvio falhar.
        const snapshot = messages;
        // Otimista: atualiza o texto na bolha e corta as respostas antigas do turno.
        setMessages(prev => {
            const lastUserIdx = prev.map(m => m.role).lastIndexOf("user");
            if (lastUserIdx < 0) return prev;
            return prev.slice(0, lastUserIdx + 1).map((m, i) => i === lastUserIdx ? { ...m, content: text } : m);
        });
        try {
            const response = await editLastMessage(chatId, text);
            if (response.success && response.message) {
                const incoming = response.message as Message;
                setMessages(prev => [...prev, incoming]);
                setAnimatingId(incoming.id);
                if (voiceReply.enabled) speakText(incoming.content);
            } else {
                setMessages(snapshot);
                toast.error(response.error || "Não foi possível reenviar.");
            }
        } catch {
            setMessages(snapshot);
            toast.error("Erro ao reenviar a mensagem.");
        } finally {
            setIsLoading(false);
        }
    };

    // Regenera a última resposta: o servidor apaga a antiga e gera outra com a
    // MESMA IA, reaproveitando a última mensagem do usuário (sem duplicá-la).
    const handleRegenerate = async () => {
        if (!chatId || isLoading) return;
        setIsLoading(true);
        try {
            const response = await regenerateResponse(chatId);
            if (response.success && response.message) {
                const incoming = response.message as Message;
                setMessages(prev => {
                    // Mantém tudo até a última mensagem do usuário; descarta as
                    // respostas daquele turno (substituídas no servidor).
                    const lastUserIdx = prev.map(m => m.role).lastIndexOf("user");
                    const kept = lastUserIdx >= 0 ? prev.slice(0, lastUserIdx + 1) : prev;
                    return [...kept, incoming];
                });
                setAnimatingId(incoming.id);
                if (voiceReply.enabled) speakText(incoming.content);
            } else {
                toast.error(("error" in response && response.error) || "Não foi possível regenerar.");
            }
        } catch {
            toast.error("Erro ao regenerar a resposta.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (editing) handleEditSend(input);
            else handleSend(input);
        }
        if (e.key === "Escape" && editing) {
            e.preventDefault();
            cancelEditing();
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 relative">

            {/* MARCA D'ÁGUA DE FUNDO */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <CurrentIcon className={cn("w-[400px] h-[400px] opacity-[0.02] dark:opacity-[0.03] -rotate-12 transition-colors duration-1000", currentStyle.color)} />
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 scroll-smooth z-10 space-y-6">
                
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
                                        <Link href="/settings?tab=intelligence" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90">
                                            <Settings className="h-4 w-4" /> Conectar IA
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
                                    <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground">
                                        {greeting()}{userName ? `, ${userName}` : ""}
                                    </h3>
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                                        Sistemas operantes via protocolo <span className={cn("font-black", currentStyle.color)}>{currentStyle.label}</span>.
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
                    const time = messageTime(msg.createdAt);

                    // Separador de dia: aparece quando a data muda em relação à mensagem anterior.
                    const curDate = msg.createdAt ? new Date(msg.createdAt) : null;
                    const prevRaw = index > 0 ? messages[index - 1].createdAt : null;
                    const prevDate = prevRaw ? new Date(prevRaw) : null;
                    const daySep =
                        curDate && !Number.isNaN(curDate.getTime()) &&
                        (!prevDate || Number.isNaN(prevDate.getTime()) || dayLabel(curDate) !== dayLabel(prevDate))
                            ? dayLabel(curDate)
                            : null;

                    // Agrupamento: mensagens consecutivas do mesmo autor ficam mais
                    // próximas, sem repetir o avatar; o carimbo de hora aparece só
                    // na última do grupo (estilo iMessage/WhatsApp).
                    const grouped = !daySep && index > 0 && messages[index - 1].role === msg.role;
                    const nextSame = index < messages.length - 1 && messages[index + 1].role === msg.role;

                    return (
                        <Fragment key={msg.id || index}>
                        {daySep && (
                            <div suppressHydrationWarning className="flex items-center gap-3 py-1 animate-in fade-in">
                                <div className="h-px flex-1 bg-border/40" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{daySep}</span>
                                <div className="h-px flex-1 bg-border/40" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500",
                                isUser ? "justify-end" : "justify-start",
                                grouped && "-mt-4"
                            )}
                        >
                            {!isUser && (
                                grouped ? (
                                    <div className="w-8 shrink-0" aria-hidden />
                                ) : (
                                    <Avatar className={cn("h-8 w-8 mt-1 border shadow-md shrink-0", style.bgColor, style.borderColor)}>
                                        <AvatarFallback className="bg-transparent">
                                            <MsgIcon className={cn("h-4 w-4", style.color)} />
                                        </AvatarFallback>
                                    </Avatar>
                                )
                            )}

                            <div className={cn("flex max-w-[85%] flex-col md:max-w-[75%]", isUser ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "relative w-fit max-w-full px-5 py-3.5 text-sm leading-relaxed",
                                    isUser
                                        ? cn(
                                            "group/msg rounded-[1.375rem] bg-gradient-to-br from-primary to-primary/85 font-medium text-primary-foreground shadow-md shadow-primary/15",
                                            !nextSame && "rounded-br-md"
                                        )
                                        : cn(
                                            "group/msg rounded-[1.375rem] border bg-card/95 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
                                            !grouped && "rounded-tl-md",
                                            style.borderColor
                                        )
                                )}>
                                    {isUser ? (
                                        <>
                                            <UserBubbleActions
                                                text={msg.content}
                                                onEdit={!isLoading && !editing && chatId && msg.id === lastUserId
                                                    ? () => startEditing(msg.content)
                                                    : undefined}
                                            />
                                            {/* Imagens anexadas (visão) — renderizadas na bolha */}
                                            {msg.images && msg.images.length > 0 && (
                                                <div className="mb-2 flex flex-wrap gap-2">
                                                    {msg.images.map((src, i) => (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            key={i}
                                                            src={src}
                                                            alt={`Anexo ${i + 1}`}
                                                            className="max-h-44 max-w-full rounded-xl border border-primary-foreground/25 object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </>
                                    ) : (
                                        <AssistantContent
                                            message={msg}
                                            style={style}
                                            animate={msg.id === animatingId}
                                            onProgress={scrollToEnd}
                                            onDone={clearAnimating}
                                            onRegenerate={!isLoading && chatId && msg.id === lastAssistantId ? handleRegenerate : undefined}
                                            onSuggest={!isLoading && msg.id === lastAssistantId ? handleSend : undefined}
                                        />
                                    )}
                                </div>

                                {/* Carimbo: hora (+ IA/modelo) — só na última msg do grupo */}
                                {time && !nextSame && (
                                    <span suppressHydrationWarning className="mt-1 px-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
                                        {!isUser && `${style.label}${msg.model ? ` · ${msg.model}` : ""} · `}{time}
                                    </span>
                                )}
                            </div>
                        </div>
                        </Fragment>
                    );
                })}

                {isLoading && (
                    <div className="flex w-full gap-3 animate-in fade-in zoom-in duration-300">
                        <Avatar className={cn("h-8 w-8 mt-1 border shadow-sm", currentStyle.bgColor, currentStyle.borderColor)}>
                            <AvatarFallback className="bg-transparent">
                                <CurrentIcon className={cn("h-4 w-4 animate-spin", currentStyle.color)} />
                            </AvatarFallback>
                        </Avatar>
                        {streamText ? (
                            /* STREAMING REAL: o texto chega token a token via SSE. */
                            <div className={cn(
                                "max-w-[85%] md:max-w-[75%] rounded-[1.375rem] rounded-tl-md border bg-card/95 px-5 py-3.5 text-sm leading-relaxed shadow-sm backdrop-blur-sm",
                                currentStyle.borderColor
                            )}>
                                <div className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none overflow-x-auto",
                                    "prose-p:my-2 prose-headings:my-3 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider",
                                    "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none",
                                    "prose-strong:font-black"
                                )}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamText}</ReactMarkdown>
                                </div>
                                <span className={cn("ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-sm align-middle", currentStyle.color.replace("text-", "bg-"))} />
                            </div>
                        ) : (
                            <div className="bg-card/95 border border-border/40 px-5 py-3.5 rounded-[1.375rem] rounded-tl-md shadow-sm flex items-center gap-1.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]", currentStyle.color.replace("text-", "bg-"))} />
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]", currentStyle.color.replace("text-", "bg-"))} />
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", currentStyle.color.replace("text-", "bg-"))} />
                                <LoadingLabel override={streamStatus} />
                            </div>
                        )}
                    </div>
                )}
                
                <div ref={scrollRef} className="h-1" />
            </div>

            {/* --- INPUT FLUTUANTE (em fluxo: não cobre as mensagens, mas mantém o visual) --- */}
            <div className="shrink-0 relative z-20">
                <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent" />

                {/* Voltar ao fim da conversa */}
                {showJump && (
                    <button
                        type="button"
                        onClick={jumpToEnd}
                        title="Ir para a mensagem mais recente"
                        className="absolute -top-12 right-6 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-lg backdrop-blur transition hover:border-primary/40 hover:text-foreground animate-in fade-in slide-in-from-bottom-2"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </button>
                )}
                <div className="relative p-4 md:p-6 pt-3 max-w-3xl mx-auto">
                    
                    {/* Banner do modo edição */}
                    {editing && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 animate-in fade-in slide-in-from-bottom-1">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                                <Pencil className="h-3 w-3" /> Editando a última mensagem — Enter reenvia, Esc cancela
                            </span>
                            <button
                                type="button"
                                onClick={cancelEditing}
                                title="Cancelar edição"
                                className="rounded p-0.5 text-amber-600 transition hover:bg-amber-500/15"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-center mb-3">
                        <span className={cn(
                            "text-[9px] uppercase font-black tracking-[0.2em] px-3 py-1.5 rounded-full border bg-background/80 backdrop-blur-md shadow-sm transition-colors duration-500 flex items-center gap-2",
                            currentStyle.color, currentStyle.borderColor
                        )}>
                            <CurrentIcon className="w-3 h-3" />
                            {currentStyle.label}
                        </span>
                    </div>

                    {/* Ditado ao vivo: cronômetro + transcrição parcial enquanto fala */}
                    {dictation.listening && (
                        <div className="mb-2 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 animate-in fade-in slide-in-from-bottom-1">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                            </span>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-500">
                                Ouvindo · {formatListenClock(dictation.seconds)}
                            </span>
                            <span className="truncate text-xs italic text-muted-foreground">
                                {dictation.interim || "pode falar…"}
                            </span>
                            <button
                                type="button"
                                onClick={dictation.stop}
                                className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500 transition hover:bg-rose-500/10"
                            >
                                Parar
                            </button>
                        </div>
                    )}

                    {/* Previews dos anexos (imagens prontas para enviar) */}
                    {attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-1">
                            {attachments.map((att, i) => (
                                <div key={i} className="group/att relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="h-16 w-16 rounded-xl border border-border/50 object-cover shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(i)}
                                        title={`Remover ${att.name}`}
                                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground shadow transition hover:text-rose-500"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={cn(
                        "relative flex items-end gap-2 bg-background/80 backdrop-blur-xl border rounded-[2rem] p-2 shadow-2xl transition-all duration-300",
                        "focus-within:ring-2 focus-within:ring-opacity-20",
                        currentStyle.borderColor,
                        currentStyle.ringColor
                    )}>
                        {/* Anexar imagem/arquivo (visão multimodal) */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.txt,.md,.csv,.json,.log"
                            multiple
                            className="hidden"
                            onChange={(e) => void handleFiles(e.target.files)}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            title="Anexar imagem (recibo, prato, print) ou arquivo de texto"
                            className="mb-1 ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all hover:bg-muted hover:text-foreground"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
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
                        <div className="flex items-center gap-1 pb-1 pr-1 shrink-0">
                            {/* Ler respostas em voz alta (toggle persistido no aparelho) */}
                            {voiceReply.available && (
                                <button
                                    type="button"
                                    onClick={voiceReply.toggle}
                                    title={voiceReply.enabled ? "Parar de ler respostas em voz alta" : "Ler respostas em voz alta"}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                                        voiceReply.enabled
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {voiceReply.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </button>
                            )}
                            {/* Ditado por voz (Web Speech API, pt-BR) */}
                            {dictation.supported && (
                                <button
                                    type="button"
                                    onClick={dictation.toggle}
                                    disabled={isLoading}
                                    title={dictation.listening ? "Parar o ditado" : "Falar em vez de digitar"}
                                    className={cn(
                                        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all",
                                        dictation.listening
                                            ? "bg-rose-500/15 text-rose-500"
                                            : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {dictation.listening && (
                                        <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" />
                                    )}
                                    <Mic className="h-4 w-4" />
                                </button>
                            )}
                            <Button
                                size="icon"
                                onClick={() => (editing ? handleEditSend(input) : handleSend(input))}
                                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                                className={cn(
                                    "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                    (input.trim() || attachments.length > 0)
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