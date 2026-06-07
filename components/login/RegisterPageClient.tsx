"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { register } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, Command, BrainCircuit,
    AlertCircle, ArrowUp, Brain, User as UserIcon, UserPlus, Database,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { validatePasswordStrength } from "@/lib/password-policy";

const FEATURES = [
    { title: "Central de Comando", desc: "Finanças, Projetos e Saúde num único dashboard.", icon: Command },
    { title: "Cérebro Digital", desc: "IA que entende o contexto da sua vida.", icon: BrainCircuit },
    { title: "Dados isolados", desc: "Sua conta é só sua — separada de qualquer outra.", icon: ShieldCheck },
];

interface Strength { score: number; label: string; bar: string; text: string; }
function passwordStrength(p: string): Strength {
    if (!p) return { score: 0, label: "—", bar: "bg-muted", text: "text-muted-foreground" };
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Za-z]/.test(p) && /[0-9]/.test(p)) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { score: Math.max(s, 1), label: "Fraca", bar: "bg-red-500", text: "text-red-600" };
    if (s === 2) return { score: s, label: "Razoável", bar: "bg-amber-500", text: "text-amber-600" };
    if (s === 3) return { score: s, label: "Boa", bar: "bg-lime-500", text: "text-lime-600" };
    return { score: 4, label: "Forte", bar: "bg-emerald-500", text: "text-emerald-600" };
}

export default function RegisterPageClient() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentFeature, setCurrentFeature] = useState(0);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const strength = passwordStrength(pass);

    useEffect(() => {
        const t = setInterval(() => setCurrentFeature((p) => (p + 1) % FEATURES.length), 5000);
        return () => clearInterval(t);
    }, []);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => setCapsLockOn(e.getModifierState("CapsLock"));
    const clearError = () => { if (error) setError(null); };

    const handleSubmit = async (formData: FormData) => {
        if (pass !== confirm) {
            setError("As senhas não coincidem.");
            toast.error("As senhas não coincidem.");
            return;
        }
        const check = validatePasswordStrength(pass);
        if (!check.valid) {
            setError(check.message!);
            toast.error(check.message!);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const result = await register(undefined as never, formData);
            if (result && result.error) {
                setError(result.error);
                toast.error(result.error);
                setIsLoading(false);
            }
        } catch (err: unknown) {
            const isRedirect = err instanceof Error && err.message.includes("NEXT_REDIRECT");
            if (isRedirect) {
                toast.success("Conta criada! Bem-vindo ao Life OS.");
                throw err;
            }
            console.error("Erro no cadastro:", err);
            setError("Ocorreu um erro ao criar a conta. Tente novamente.");
            setIsLoading(false);
        }
    };

    const ActiveIcon = FEATURES[currentFeature].icon;

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground lg:overflow-hidden">

            {/* --- COLUNA ESQUERDA: FORMULÁRIO --- */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 relative z-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]" />

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
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight">Criar sua conta</h1>
                        <p className="text-muted-foreground text-sm">
                            Crie um acesso próprio — seus dados ficam isolados dos demais.
                        </p>
                    </div>

                    {/* Nota de instância: deixa claro QUAL banco recebe os dados (Modelo A). */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3 text-left">
                        <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Sua conta é isolada por usuário, mas é gravada no banco{" "}
                            <span className="font-semibold text-foreground">desta instância</span>. Se
                            ela for compartilhada, os dados ficam no banco do dono da instalação.{" "}
                            <a
                                href="https://github.com/LuixzSouza/Projeto-Life-OS/blob/main/docs/SELF_HOSTING.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:underline underline-offset-2"
                            >
                                Quer um banco só seu?
                            </a>
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-5">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Nome</Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="name" name="name" type="text" placeholder="Seu nome" required autoFocus
                                    disabled={isLoading} onChange={clearError} className="h-12 pl-9 bg-muted/40" />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="seu.email@exemplo.com" required
                                autoComplete="email" disabled={isLoading} onChange={clearError} className="h-12 bg-muted/40" />
                        </div>

                        {/* Senha */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Senha</Label>
                            <div className="relative">
                                <Input id="password" name="password" type={showPassword ? "text" : "password"} required
                                    autoComplete="new-password" disabled={isLoading}
                                    value={pass} onChange={(e) => { setPass(e.target.value); clearError(); }}
                                    onKeyDown={handleKeyDown} onKeyUp={handleKeyDown}
                                    className={cn("h-12 pr-10 bg-muted/40", capsLockOn && "border-amber-500/60")} />
                                <button type="button" disabled={isLoading} onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {/* Medidor de força */}
                            {pass ? (
                                <div className="space-y-1 pt-0.5">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < strength.score ? strength.bar : "bg-muted")} />
                                        ))}
                                    </div>
                                    <p className={cn("text-[11px] font-medium", strength.text)}>Força: {strength.label}</p>
                                </div>
                            ) : (
                                <p className="text-[11px] text-muted-foreground">Mín. 8 caracteres, com letras e números.</p>
                            )}
                            <AnimatePresence>
                                {capsLockOn && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                        className="flex items-center gap-1.5 text-amber-500 text-xs font-medium">
                                        <ArrowUp className="h-3 w-3" /> Caps Lock ativado
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Confirmar */}
                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Confirmar Senha</Label>
                            <Input id="confirm" type={showPassword ? "text" : "password"} required autoComplete="new-password"
                                disabled={isLoading} value={confirm} onChange={(e) => { setConfirm(e.target.value); clearError(); }}
                                className={cn("h-12 bg-muted/40", pass && confirm && pass !== confirm && "border-destructive focus-visible:ring-destructive")} />
                        </div>

                        {/* Erro */}
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden" role="alert" aria-live="assertive">
                                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <span className="font-semibold text-destructive block mb-0.5">Não foi possível criar</span>
                                            <span className="text-muted-foreground">{error}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button type="submit" size="lg"
                            className="w-full h-12 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
                            disabled={isLoading}>
                            {isLoading ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Criando…</span>
                            ) : (
                                <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Criar conta</span>
                            )}
                        </Button>
                    </form>

                    {/* Já tem conta */}
                    <div className="pt-4 border-t border-border/60 text-center">
                        <span className="text-xs text-muted-foreground">Já tem uma conta? </span>
                        <Link href="/login" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                            Entrar <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* Destaques (mobile) */}
                    <div className="lg:hidden space-y-2 pt-2">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
                                <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span className="text-xs text-muted-foreground leading-snug">
                                    <span className="font-semibold text-foreground">{f.title}.</span> {f.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* --- COLUNA DIREITA: SHOWCASE --- */}
            <div className="hidden lg:flex flex-col justify-center items-center relative border-l border-border/60 overflow-hidden landing-aurora landing-grid bg-gradient-to-br from-primary/5 via-background to-background">
                <div className="relative z-10 w-full max-w-md px-12">
                    <div className="mb-16 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight leading-none">Life OS</h2>
                            <span className="text-xs text-primary font-mono">Seu segundo cérebro</span>
                        </div>
                    </div>

                    <div className="relative h-[200px]">
                        <AnimatePresence mode="wait">
                            <motion.div key={currentFeature} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0">
                                <div className="flex flex-col gap-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                        <ActiveIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">{FEATURES[currentFeature].title}</h3>
                                        <p className="text-muted-foreground text-lg leading-relaxed">{FEATURES[currentFeature].desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-2 mt-8">
                        {FEATURES.map((_, idx) => (
                            <button key={idx} type="button" aria-label={`Ir para ${FEATURES[idx].title}`} onClick={() => setCurrentFeature(idx)}
                                className={cn("h-1.5 rounded-full transition-all duration-500", idx === currentFeature ? "w-12 bg-primary" : "w-2.5 bg-foreground/20 hover:bg-foreground/40")} />
                        ))}
                    </div>

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
