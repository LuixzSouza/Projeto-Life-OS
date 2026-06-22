"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { verifyMasterPassword } from "@/app/(dashboard)/settings/actions";
import { signOut } from "@/app/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2, ShieldAlert, Eye, EyeOff, TriangleAlert, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LockScreenProps {
    onUnlock: () => void;
}

// Trava progressiva: após muitas tentativas erradas, o campo congela por um tempo
// (defesa contra força-bruta no cadeado local, sem depender do servidor).
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

// Saudação pelo horário — toque humano na tela de bloqueio.
function greeting(hour: number): string {
    if (hour < 6) return "Boa madrugada";
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [loggingOut, setLoggingOut] = useState(false);
    // Fim da trava (epoch ms); 0 = liberado.
    const [cooldownUntil, setCooldownUntil] = useState(0);

    // 1. CONTROLE DE HIDRATAÇÃO SEGURO
    const [mounted, setMounted] = useState(false);
    // Relógio ao vivo (também alimenta a contagem da trava). Inicia no agora.
    const [now, setNow] = useState(() => Date.now());
    const lockRef = useRef<HTMLDivElement>(null);
    const shake = useAnimationControls();

    // Resolvemos o erro de "Cascading renders" jogando o setState para o fim da fila.
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Relógio: um tique por segundo (atualiza hora/data e a contagem da trava).
    useEffect(() => {
        if (!mounted) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [mounted]);

    // Trava o scroll da página enquanto a tela de bloqueio estiver ativa — o
    // conteúdo borrado atrás não pode rolar e o overlay não faz "rubber-band".
    useEffect(() => {
        const html = document.documentElement;
        const prevHtml = html.style.overflow;
        const prevBody = document.body.style.overflow;
        const prevOverscroll = document.body.style.overscrollBehavior;
        html.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        return () => {
            html.style.overflow = prevHtml;
            document.body.style.overflow = prevBody;
            document.body.style.overscrollBehavior = prevOverscroll;
        };
    }, []);

    // 2. ARMADURA ANTI-SABOTAGEM
    useEffect(() => {
        // Só liga a armadura se o componente já estiver montado E a div do cofre existir.
        if (!mounted || !lockRef.current) return;

        // A. Bloqueia o Menu de Contexto (Botão Direito)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // B. Bloqueia atalhos de DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U)
        const handleKeyDown = (e: KeyboardEvent) => {
            // Esc não pode "fechar" nada por baixo — bloqueia silenciosamente.
            if (e.key === "Escape") {
                e.preventDefault();
                return;
            }
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
                (e.ctrlKey && e.key === "U")
            ) {
                e.preventDefault();
                setIsError(true);
                toast.error("Tentativa de infração detectada. Acesso bloqueado.");
                setTimeout(() => setIsError(false), 2000);
            }
        };

        // C. O Vigilante Oculto (MutationObserver)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    // Se alguém deletar a nossa div do HTML, a página recarrega e tranca tudo
                    if (node === lockRef.current || (lockRef.current && !document.body.contains(lockRef.current))) {
                        window.location.reload();
                    }
                });
            });
        });

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            observer.disconnect();
        };
    }, [mounted]);

    // Trava o gesto/botão "voltar": empurra um estado e, a cada tentativa de sair,
    // reempurra — o histórico não leva para fora da tela de bloqueio.
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        const onPop = () => window.history.pushState(null, "", window.location.href);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        // Limpa o flag local de bloqueio para não retravar após o próximo login.
        try { window.localStorage.removeItem("life-os-locked"); } catch { /* ignora */ }
        await signOut(); // encerra a sessão e redireciona para /login
    };

    const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
    const locked = cooldownLeft > 0;

    const flagError = () => {
        setIsError(true);
        void shake.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.5 } });
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim() || locked) return;

        setLoading(true);
        setIsError(false);

        const res = await verifyMasterPassword(password);

        if (res.success) {
            toast.dismiss();
            toast.success("Acesso autorizado.");
            onUnlock();
        } else {
            setPassword("");
            flagError();
            const next = attempts + 1;
            if (next >= MAX_ATTEMPTS) {
                setAttempts(0);
                setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
                toast.error(`Muitas tentativas. Aguarde ${COOLDOWN_SECONDS}s para tentar de novo.`);
            } else {
                setAttempts(next);
                toast.error("Credencial inválida. Acesso negado.");
            }
            setTimeout(() => setIsError(false), 1000);
        }
        setLoading(false);
    };

    // Evita o erro de SSR retornando null até o navegador assumir o controle
    if (!mounted) return null;

    const clock = new Date(now);
    const timeLabel = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dateLabel = cap(clock.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }));

    return (
        <div ref={lockRef} className="fixed inset-0 z-[9999] flex h-dvh flex-col items-center justify-center overflow-hidden overscroll-none p-4 animate-in fade-in duration-500">

            {/* FUNDO: blur pesado + aurora temática (reaproveita a utility da landing) + grid sutil */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-3xl" />
            <div className="landing-aurora" aria-hidden />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:44px_44px] pointer-events-none" />

            {/* RELÓGIO AO VIVO + SAUDAÇÃO */}
            <div className="relative z-10 mb-6 flex shrink-0 flex-col items-center text-center sm:mb-8">
                <span className="font-mono text-5xl font-extralight tracking-tight text-foreground tabular-nums sm:text-6xl md:text-7xl">
                    {timeLabel}
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{dateLabel}</span>
                <span className="mt-0.5 text-xs font-medium text-muted-foreground/70">{greeting(clock.getHours())} 👋</span>
            </div>

            {/* COFRE / MODAL PRINCIPAL */}
            <motion.div
                animate={shake}
                className={cn(
                    "relative z-10 w-full max-w-[400px] shrink-0 rounded-[2.5rem] border border-border/40 bg-background/80 p-6 shadow-2xl backdrop-blur-xl transition-colors duration-300 sm:p-8 md:p-10",
                    isError && "border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)]"
                )}
            >

                <div className="mb-6 flex flex-col items-center space-y-4 text-center sm:mb-8 sm:space-y-5">
                    <div className="relative">
                        <div className={cn(
                            "absolute inset-0 rounded-full opacity-50 blur-xl animate-pulse",
                            isError ? "bg-rose-500" : "bg-primary"
                        )} />
                        <div className={cn(
                            "relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner transition-colors duration-300",
                            isError ? "border-rose-500/50 bg-rose-500/10 text-rose-500" : "border-primary/20 bg-primary/10 text-primary"
                        )}>
                            {isError ? <ShieldAlert className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <h2 className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Protocolo de Segurança
                        </h2>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                            Sistema Bloqueado
                        </h1>
                        <p className="px-4 text-xs font-medium text-muted-foreground/80">
                            Digite sua senha mestra para retomar a sessão com segurança.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Input
                                type={showPw ? "text" : "password"}
                                placeholder="••••••••"
                                inputMode="text"
                                className={cn(
                                    "h-14 rounded-2xl border-border/50 bg-muted/20 pr-12 text-center font-mono text-xl tracking-[0.5em] transition-all duration-300",
                                    "placeholder:tracking-normal focus-visible:ring-2",
                                    isError ? "border-rose-500/50 text-rose-500 focus-visible:ring-rose-500/50" : "text-foreground focus-visible:ring-primary/50"
                                )}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setIsError(false);
                                }}
                                onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                                onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                                disabled={loading || locked}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                disabled={locked}
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                                aria-pressed={showPw}
                                tabIndex={-1}
                            >
                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Avisos contextuais: Caps Lock e tentativas erradas */}
                        {capsOn && !locked && (
                            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-600">
                                <TriangleAlert className="h-3.5 w-3.5" /> Caps Lock está ligado
                            </p>
                        )}
                        {!locked && attempts > 0 && (
                            <p className="text-center text-[11px] font-medium text-rose-500/90">
                                {attempts} de {MAX_ATTEMPTS} tentativa{attempts === 1 ? "" : "s"} incorreta{attempts === 1 ? "" : "s"}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !password || locked}
                        className={cn(
                            "h-14 w-full rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg transition-all duration-300",
                            locked
                                ? "bg-muted text-muted-foreground"
                                : isError
                                    ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600"
                                    : "bg-foreground text-background hover:scale-[1.02] hover:bg-foreground/90"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : locked ? (
                            <span className="flex items-center gap-2 tabular-nums">
                                <Lock className="h-4 w-4" /> Aguarde {cooldownLeft}s
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Desbloquear <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </Button>
                </form>

                {/* Esqueceu a senha mestra? Sair da conta (vai para /login). */}
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
                >
                    {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                    Esqueci a senha — sair da conta
                </button>
            </motion.div>

            <p className="relative z-10 mt-6 hidden max-w-xs shrink-0 text-center text-[10px] leading-relaxed text-muted-foreground/50 sm:block">
                Console de desenvolvedor e interações não autorizadas estão desativados nesta tela.
            </p>
        </div>
    );
}
