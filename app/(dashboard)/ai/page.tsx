import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { ChatInterface } from "@/components/ai/chat-interface";
import { ConversationSidebar } from "@/components/ai/conversation-sidebar";
import Link from "next/link";
import { BrainCircuit, Sparkles, Cloud, Activity, Zap, HardDrive, Wind, CalendarClock, Brain, Asterisk, Orbit, Network, KeyRound, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ai/model-selector";
import { DeleteChatForm } from "../../../components/ai/delete-chat-form";
import { ExportChatButton } from "@/components/ai/export-chat-button";
import { getAiStatus, providerMeta, normalizeProvider, stripPending, extractActions, extractSuggestions, extractClarify, extractNav, extractImages } from "@/lib/ai-help";
import { isEphemeralServerless } from "@/lib/db-config";
import { AI_PROVIDERS } from "@/lib/ai-models";

export const dynamic = 'force-dynamic';

interface AIPageProps {
    searchParams: Promise<{ id?: string; new?: string; q?: string }>;
}

export default async function AIPage({ searchParams }: AIPageProps) {
    const params = await searchParams;
    // ?q= → deep-link "perguntar à IA": abre conversa nova com o composer
    // preenchido (o usuário revisa e envia). Usável de qualquer módulo.
    const prefill = (params.q ?? "").slice(0, 2000) || undefined;
    const isNew = params.new === "1" || Boolean(prefill);

    const userId = await getCurrentUserId();

    // Lista de conversas (para a sidebar) + settings + nome do usuário, em paralelo.
    const [chats, settings, user] = await Promise.all([
        prisma.aiChat.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true, title: true, createdAt: true,
                _count: { select: { messages: true } },
                // IA "dona" da conversa = provedor/modelo da 1ª resposta da IA.
                messages: { where: { role: "assistant", provider: { not: null } }, orderBy: { createdAt: "asc" }, take: 1, select: { provider: true, model: true } },
            },
        }),
        userId ? prisma.settings.findUnique({ where: { userId } }) : null,
        userId ? prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null,
    ]);
    // 1º nome para a saudação do estado vazio do chat.
    const firstName = user?.name?.trim().split(/\s+/)[0] || undefined;

    const currentProvider = normalizeProvider(settings?.aiProvider);
    const currentModel = settings?.aiModel || "llama3.1";

    // Cada IA tem a própria conversa: a "dona" é quem deu a 1ª resposta. Trocar
    // de IA no seletor abre o histórico DELA (ou um chat vazio se ainda não tem);
    // voltar para a IA anterior restaura as mensagens antigas dela.
    const ownedByCurrentAI = (chat: (typeof chats)[number]) => {
        const first = chat.messages[0];
        if (!first?.provider) return false;
        if (normalizeProvider(first.provider) !== currentProvider) return false;
        return !first.model || first.model === currentModel;
    };

    // Conversa selecionada: ?id= se existir, senão a mais recente DA IA ATUAL
    // (a menos que ?new=1). Pelo histórico dá para abrir conversa de qualquer IA.
    const requestedId = params.id;
    const selectedId = isNew
        ? undefined
        : (requestedId && chats.some((c) => c.id === requestedId)
            ? requestedId
            : chats.find(ownedByCurrentAI)?.id);

    const selectedChat = selectedId
        ? await prisma.aiChat.findFirst({
            where: { id: selectedId, userId },
            include: { messages: { orderBy: { createdAt: "asc" } } },
        })
        : null;

    const isLocal = currentProvider === 'ollama';

    // Status centralizado de conexão da IA (para onboarding/feedback no chat).
    // MESMA regra do sendMessage: chave nas Settings OU variável de ambiente —
    // senão a página diria "não conectada" enquanto o chat funcionaria.
    const providerInfo = providerMeta(currentProvider);
    const keyInSettings = !!(settings as unknown as Record<string, string | null>)?.[providerInfo.keyField ?? ""];
    const keyInEnv = !!process.env[`${currentProvider.toUpperCase()}_API_KEY`];
    const keyPresent = providerInfo.local ? true : (keyInSettings || keyInEnv);
    const aiStatus = getAiStatus(currentProvider, keyPresent, isEphemeralServerless());

    // IAs prontas para uso (chave salva nas Settings, env var, ou local sem chave)
    // — o seletor de modelos marca cada uma com um ponto verde.
    const settingsKeys = settings as unknown as Record<string, string | null> | null;
    const configuredProviders = AI_PROVIDERS
        .filter((p) => p.local
            || Boolean(settingsKeys?.[`${p.id}Key`])
            || Boolean(process.env[`${p.id.toUpperCase()}_API_KEY`]))
        .map((p) => p.id);

    // Limite de contexto dinâmico (por provedor/modelo).
    const getContextLimit = (provider: string, model: string) => {
        if (provider === 'google') return 1048576;
        if (provider === 'anthropic') return 200000;
        if (provider === 'openai' && model.includes('gpt-4')) return 128000;
        if (provider === 'openai') return 16384;
        if (provider === 'groq') return 131072;    // llama-3.3-70b-versatile
        if (provider === 'xai') return 131072;
        if (provider === 'deepseek') return 64000;
        if (provider === 'mistral') return 128000; // mistral-large-latest
        if (provider === 'openrouter') return 128000;
        return 8192;
    };
    const CONTEXT_LIMIT = getContextLimit(currentProvider, currentModel);

    // stripPending: marcadores internos (inclusive imagens base64) não contam
    // como contexto — imagens só viajam no turno em que foram anexadas.
    const totalChars = selectedChat?.messages.reduce((acc, msg) => acc + stripPending(msg.content).length, 0) || 0;
    const estimatedTokens = Math.ceil((totalChars + 500) / 4);
    const memoryPercentage = Math.min(Math.round((estimatedTokens / CONTEXT_LIMIT) * 100), 100);

    const getMemoryStatus = (pct: number) => {
        if (pct > 90) return { color: "bg-rose-500", text: "text-rose-500", label: "CRÍTICO" };
        if (pct > 70) return { color: "bg-amber-500", text: "text-amber-500", label: "ALTO" };
        return { color: "bg-emerald-500", text: "text-emerald-500", label: "ESTÁVEL" };
    };
    const status = getMemoryStatus(memoryPercentage);

    // Uso mensal (telemetria).
    let usage: Record<string, number | string> = {};
    try { usage = settings?.aiUsage ? JSON.parse(settings.aiUsage as string) : {}; } catch { usage = {}; }
    const monthlyTokensUsed = Number(usage[currentProvider]) || 0;
    const lastResetStr = String(usage.lastReset || new Date().toISOString());
    const lastResetDate = new Date(lastResetStr);
    const nextRenewal = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth() + 1, 1);
    const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" });

    const chatID = selectedChat?.id;
    const initialMessages = selectedChat?.messages.map(msg => ({
        id: msg.id,
        chatId: msg.chatId,
        role: msg.role as "user" | "assistant",
        content: stripPending(msg.content),
        actions: extractActions(msg.content),
        suggestions: extractSuggestions(msg.content),
        clarify: extractClarify(msg.content) ?? undefined,
        nav: extractNav(msg.content),
        images: extractImages(msg.content),
        createdAt: msg.createdAt,
        provider: msg.provider,
        model: msg.model
    })) || [];

    const ProviderIcon =
        currentProvider === 'groq' ? Zap :
        currentProvider === 'openai' ? Cloud :
        currentProvider === 'google' ? Sparkles :
        currentProvider === 'deepseek' ? Brain :
        currentProvider === 'mistral' ? Wind :
        currentProvider === 'anthropic' ? Asterisk :
        currentProvider === 'xai' ? Orbit :
        currentProvider === 'openrouter' ? Network : HardDrive;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-2rem)] bg-background relative overflow-hidden animate-in fade-in duration-700">

            {/* --- HEADER TÁTICO (HUD) — 2 linhas, 100% utilizável no mobile --- */}
            <header className="shrink-0 z-20 border-b border-border/40 bg-card/30 backdrop-blur-md">
                {/* Linha 1: identidade + conversa atual + ações */}
                <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 md:px-8 md:pt-4">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-inner sm:flex">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-xs font-black uppercase tracking-[0.2em] text-foreground">Cérebro Digital</h1>
                                <Badge variant="outline" className="hidden sm:inline-flex text-[8px] font-black px-1.5 h-4 border-primary/30 text-primary bg-primary/5 animate-pulse">LIVE</Badge>
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

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        {/* Histórico: gatilho no header (abre painel deslizante) */}
                        <ConversationSidebar
                            chats={chats.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, count: c._count.messages, provider: c.messages[0]?.provider ?? null }))}
                            activeId={selectedId}
                            activeTitle={selectedChat?.title}
                        />
                        {/* Nova conversa: atalho direto no header */}
                        <Link
                            href="/ai?new=1"
                            title="Nova conversa"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                        >
                            <Plus className="h-5 w-5" />
                        </Link>
                        {/* Conectar IA: atalho direto para cadastrar a API key/token */}
                        <Link
                            href="/settings?tab=intelligence"
                            title="Conectar IA — cadastrar API key/token"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                        >
                            <KeyRound className="h-5 w-5" />
                        </Link>
                        {chatID && <ExportChatButton chatId={chatID} />}
                        {chatID && <DeleteChatForm chatId={chatID} />}
                    </div>
                </div>

                {/* Linha 2: seletor de modelo + HUD de consumo/contexto (rola no mobile) */}
                <div className="flex items-center gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide md:px-8">
                    <ModelSelector currentProvider={currentProvider} currentModel={currentModel} configuredProviders={configuredProviders} />

                    {!isLocal && (
                        <div
                            className="hidden shrink-0 items-center gap-4 rounded-full border border-border/40 bg-muted/30 px-4 py-1.5 md:flex"
                            title="Consumo real informado pelo provedor a cada resposta (estimativa ≈4 caracteres/token só quando ele não informa), zerado todo dia 1º. Planos grátis NÃO têm teto mensal de tokens — o limite real é de requisições por minuto/dia, imposto pelo provedor."
                        >
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">Uso no mês</span>
                                <span className="text-xs font-mono font-bold text-foreground">
                                    {compact.format(monthlyTokensUsed)} <span className="text-[9px]">TKN</span>
                                    <span className="ml-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">· sem teto mensal</span>
                                </span>
                            </div>
                            <div className="h-6 w-px bg-border/50" />
                            <div className="flex items-center gap-1.5 text-muted-foreground" title={`O contador zera dia 1º. Faltam ${daysUntilRenewal} dias.`}>
                                <CalendarClock className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest">Zera em</span>
                                    <span className="text-[9px] font-bold">{daysUntilRenewal} dias</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        className="ml-auto flex w-40 shrink-0 flex-col items-end gap-1 sm:w-48"
                        title={`Memória DESTA conversa: ~${estimatedTokens.toLocaleString("pt-BR")} de ${CONTEXT_LIMIT.toLocaleString("pt-BR")} tokens que o ${currentModel} aceita por vez. Chegando perto, comece uma conversa nova.`}
                    >
                        <div className="flex w-full justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Contexto</span>
                            <span className={status.text}>{memoryPercentage}%</span>
                        </div>
                        <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-border/20 bg-muted/50">
                            <div className={cn("absolute left-0 top-0 h-full transition-all duration-1000 ease-out", status.color)} style={{ width: `${memoryPercentage}%` }} />
                        </div>
                        <span className="text-[9px] font-bold tabular-nums tracking-wider text-muted-foreground/70">
                            {compact.format(estimatedTokens)} / {compact.format(CONTEXT_LIMIT)} tokens
                        </span>
                    </div>
                </div>
            </header>

            {/* --- CHAT EM LARGURA TOTAL (sem 2ª sidebar) --- */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                <ChatInterface
                    key={`${selectedId ?? "new"}:${currentProvider}:${currentModel}`}
                    initialChatId={chatID}
                    initialMessages={initialMessages}
                    initialInput={prefill}
                    userName={firstName}
                    provider={currentProvider}
                    model={currentModel}
                    aiStatus={aiStatus}
                />
            </main>
        </div>
    );
}
