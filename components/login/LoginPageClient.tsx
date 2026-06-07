"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { authenticate } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
    Command,
    BrainCircuit,
    AlertCircle,
    ArrowUp,
    Brain,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Proteção anti força-bruta (client-side; o servidor é stateless).
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = "life-os-login-cooldown";
const LAST_EMAIL_KEY = "life-os-last-email";

/** Lê o último email usado (client-only; usado como estado inicial preguiçoso). */
function readStoredEmail(): string {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(LAST_EMAIL_KEY) ?? ""; } catch { return ""; }
}

/** Segundos restantes de um cooldown em andamento (sobrevive a reload). */
function readCooldownLeft(): number {
    if (typeof window === "undefined") return 0;
    try {
        const until = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
        return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
    } catch {
        return 0;
    }
}

// Conteúdo rotativo (Showcase)
const FEATURES = [
    {
        title: "Central de Comando",
        desc: "Finanças, Projetos e Saúde em um único dashboard unificado e inteligente.",
        icon: Command,
    },
    {
        title: "Cérebro Digital",
        desc: "IA integrada que entende o contexto da sua vida e sugere otimizações reais.",
        icon: BrainCircuit,
    },
    {
        title: "Cofre Local",
        desc: "Arquitetura SQLite. Seus dados são seus, criptografados no seu dispositivo.",
        icon: ShieldCheck,
    },
];

export default function LoginPageClient() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentFeature, setCurrentFeature] = useState(0);

    const [capsLockOn, setCapsLockOn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Email lembrado + tentativas/cooldown (init preguiçoso a partir do localStorage).
    const [email, setEmail] = useState<string>(readStoredEmail);
    const [attempts, setAttempts] = useState(0);
    const [cooldownLeft, setCooldownLeft] = useState<number>(readCooldownLeft);

    // Rotação automática dos slides
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentFeature((prev) => (prev + 1) % FEATURES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // Conta regressiva do cooldown.
    useEffect(() => {
        if (cooldownLeft <= 0) return;
        const id = setInterval(() => {
            setCooldownLeft((s) => {
                if (s <= 1) {
                    try { localStorage.removeItem(COOLDOWN_KEY); } catch { /* ignore */ }
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [cooldownLeft]);

    // Detectar Caps Lock
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        setCapsLockOn(e.getModifierState("CapsLock"));
    };

    const handleInputChange = () => {
        if (error) setError(null);
    };

    const startCooldown = () => {
        const until = Date.now() + COOLDOWN_MS;
        try { localStorage.setItem(COOLDOWN_KEY, String(until)); } catch { /* ignore */ }
        setCooldownLeft(Math.ceil(COOLDOWN_MS / 1000));
        setAttempts(0);
    };

    const handleSubmit = async (formData: FormData) => {
        if (cooldownLeft > 0) {
            toast.error(`Aguarde ${cooldownLeft}s antes de tentar novamente.`);
            return;
        }
        // Guarda o email para lembrar na próxima vez.
        try { localStorage.setItem(LAST_EMAIL_KEY, (formData.get("email") as string) || ""); } catch { /* ignore */ }

        setIsLoading(true);
        setError(null);

        try {
            const result = await authenticate(undefined as never, formData);

            if (result && result.error) {
                setError(result.error);
                toast.error(result.error);
                setIsLoading(false);

                if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(200);
                }

                // Conta a tentativa falha; ao atingir o limite, inicia o cooldown.
                const next = attempts + 1;
                if (next >= MAX_ATTEMPTS) {
                    startCooldown();
                    setError(`Muitas tentativas. Aguarde ${Math.ceil(COOLDOWN_MS / 1000)} segundos.`);
                } else {
                    setAttempts(next);
                }
            }
        } catch (err: unknown) {
            const isRedirectError =
                err instanceof Error &&
                (err.message === "NEXT_REDIRECT" || err.message.includes("NEXT_REDIRECT"));

            if (isRedirectError) {
                toast.success("Acesso liberado!");
                throw err;
            }

            console.error("Erro no login:", err);
            setError("Ocorreu um erro ao tentar conectar. Verifique o servidor.");
            setIsLoading(false);
        }
    };

    const ActiveIcon = FEATURES[currentFeature].icon;

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground lg:overflow-hidden">

            {/* --- COLUNA ESQUERDA: FORMULÁRIO --- */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 relative z-10">

                {/* Brilho de fundo sutil */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]" />

                {/* Logo Mobile */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2 font-bold text-xl">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/30">
                        <Brain className="h-5 w-5" />
                    </div>
                    Life OS
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm space-y-8 relative"
                >
                    {/* Header do Form */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
                        <p className="text-muted-foreground text-sm">
                            Digite suas credenciais para abrir seu dashboard.
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-4">

                            {/* Input Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="seu.email@lifeos.local"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    disabled={isLoading}
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); handleInputChange(); }}
                                    suppressHydrationWarning
                                    className="h-12 bg-muted/40 transition-all"
                                />
                            </div>

                            {/* Input Senha */}
                            <div className="space-y-2 relative">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Chave de Acesso
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        onKeyDown={handleKeyDown}
                                        onKeyUp={handleKeyDown}
                                        onChange={handleInputChange}
                                        className={cn(
                                            "h-12 pr-10 bg-muted/40 transition-all",
                                            capsLockOn && "border-amber-500/60 focus-visible:ring-amber-500/20"
                                        )}
                                    />
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Aviso de Caps Lock */}
                                <AnimatePresence>
                                    {capsLockOn && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="absolute -bottom-6 left-0 flex items-center gap-1.5 text-amber-500 text-xs font-medium"
                                        >
                                            <ArrowUp className="h-3 w-3" /> Caps Lock ativado
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Mensagem de Erro Inline */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-2 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <span className="font-semibold text-destructive block mb-0.5">Falha no login</span>
                                            <span className="text-muted-foreground">{error}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-12 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
                            disabled={isLoading || cooldownLeft > 0}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Autenticando…</span>
                            ) : cooldownLeft > 0 ? (
                                <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Aguarde {cooldownLeft}s</span>
                            ) : (
                                <span className="flex items-center gap-2">Entrar <ArrowRight className="h-4 w-4" /></span>
                            )}
                        </Button>

                        {/* Aviso de tentativas restantes antes do bloqueio temporário */}
                        {attempts > 0 && cooldownLeft === 0 && (
                            <p className="text-center text-[11px] text-amber-600">
                                {MAX_ATTEMPTS - attempts} tentativa(s) antes de um bloqueio temporário.
                            </p>
                        )}
                    </form>

                    {/* Cadastro + Link de Retorno */}
                    <div className="pt-4 border-t border-border/60 mt-6 space-y-3">
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground">Não tem uma conta? </span>
                            <Link
                                href="/register"
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                            >
                                Criar conta <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="text-center">
                            <Link
                                href="/"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-2 group"
                            >
                                <ArrowRight className="h-3 w-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                Voltar para a página inicial
                            </Link>
                        </div>
                    </div>

                    {/* Destaques (apenas mobile — o showcase desktop fica na coluna direita) */}
                    <div className="lg:hidden space-y-2 pt-2">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                            >
                                <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span className="text-xs text-muted-foreground leading-snug">
                                    <span className="font-semibold text-foreground">{f.title}.</span> {f.desc}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Rodapé em fluxo no mobile (evita sobreposição com o conteúdo) */}
                    <p className="lg:hidden text-center text-[10px] text-muted-foreground/70 uppercase tracking-widest font-mono pt-2">
                        Life OS • Conexão local segura
                    </p>
                </motion.div>

                {/* Rodapé fixo só no desktop */}
                <div className="hidden lg:block absolute bottom-8 text-[10px] text-muted-foreground/70 uppercase tracking-widest font-mono">
                    Life OS • Conexão local segura
                </div>
            </div>

            {/* --- COLUNA DIREITA: VISUAL SHOWCASE --- */}
            <div className="hidden lg:flex flex-col justify-center items-center relative border-l border-border/60 overflow-hidden landing-aurora landing-grid bg-gradient-to-br from-primary/5 via-background to-background">

                <div className="relative z-10 w-full max-w-md px-12">

                    {/* Branding Hero */}
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                                <Brain className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight leading-none">Life OS</h2>
                                <span className="text-xs text-primary font-mono">Seu segundo cérebro</span>
                            </div>
                        </div>
                    </div>

                    {/* Slider de Features */}
                    <div className="relative h-[220px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFeature}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute inset-0"
                            >
                                <div className="flex flex-col gap-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                        <ActiveIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">
                                            {FEATURES[currentFeature].title}
                                        </h3>
                                        <p className="text-muted-foreground text-lg leading-relaxed">
                                            {FEATURES[currentFeature].desc}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Progress Indicators */}
                    <div className="flex gap-2 mt-8">
                        {FEATURES.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                aria-label={`Ir para ${FEATURES[idx].title}`}
                                onClick={() => setCurrentFeature(idx)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    idx === currentFeature ? "w-12 bg-primary" : "w-2.5 bg-foreground/20 hover:bg-foreground/40"
                                )}
                            />
                        ))}
                    </div>

                    {/* Selo de confiança */}
                    <div className="mt-14 flex items-center gap-3 text-[11px] text-muted-foreground/70 font-mono uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary/70" /> Local-first</span>
                        <span className="text-foreground/20">•</span>
                        <span>Criptografado</span>
                        <span className="text-foreground/20">•</span>
                        <span>Offline</span>
                    </div>

                </div>
            </div>

        </main>
    );
}
