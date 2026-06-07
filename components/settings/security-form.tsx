"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { changePassword, updateSecurityPreferences, setRegistrationPolicy } from "@/app/(dashboard)/settings/actions";
import { validatePasswordStrength } from "@/lib/password-policy";
import { toast } from "sonner";
import {
    Lock,
    ShieldCheck,
    AlertTriangle,
    Eye,
    EyeOff,
    Clock,
    CheckCircle2,
    EyeClosedIcon,
    Loader2,
    UserPlus
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Interface para receber os dados do banco
interface SecurityFormProps {
    initialAutoLock?: number;
    initialPrivacyMode?: boolean;
    initialRegistrationOpen?: boolean;
}

interface StrengthResult {
    score: number; // 0–4 (nº de barras acesas)
    label: string;
    barColor: string;
    textColor: string;
}

/**
 * Medidor de força (apenas UX — o servidor valida com `validatePasswordStrength`).
 * Pontua comprimento, mistura de tipos e símbolos.
 */
function passwordStrength(password: string): StrengthResult {
    if (!password) return { score: 0, label: "—", barColor: "bg-muted", textColor: "text-muted-foreground" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: Math.max(score, 1), label: "Fraca", barColor: "bg-red-500", textColor: "text-red-600" };
    if (score === 2) return { score, label: "Razoável", barColor: "bg-amber-500", textColor: "text-amber-600" };
    if (score === 3) return { score, label: "Boa", barColor: "bg-lime-500", textColor: "text-lime-600" };
    return { score: 4, label: "Forte", barColor: "bg-emerald-500", textColor: "text-emerald-600" };
}

function formatMMSS(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Cronômetro ao vivo do bloqueio automático: conta regressivamente a partir do
 * tempo escolhido enquanto não há atividade; qualquer interação reinicia. É um
 * espelho visual do timer real do SecurityProvider (preview na própria tela).
 */
function LockCountdownBadge({ minutes }: { minutes: number }) {
    const [remaining, setRemaining] = useState(minutes * 60);
    // 0 = ainda não inicializado; Date.now() é chamado dentro do effect (impuro).
    const lastActivityRef = useRef<number>(0);

    useEffect(() => {
        lastActivityRef.current = Date.now();
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        let throttled = false;
        const onActivity = () => {
            if (throttled) return;
            lastActivityRef.current = Date.now();
            throttled = true;
            setTimeout(() => { throttled = false; }, 500);
        };
        events.forEach((e) => window.addEventListener(e, onActivity));
        // setState só dentro do callback do interval (não no corpo do effect).
        const id = setInterval(() => {
            const last = lastActivityRef.current || Date.now();
            const rem = minutes * 60 - Math.floor((Date.now() - last) / 1000);
            setRemaining(rem > 0 ? rem : 0);
        }, 1000);
        return () => {
            events.forEach((e) => window.removeEventListener(e, onActivity));
            clearInterval(id);
        };
    }, [minutes]);

    return (
        <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {remaining > 0 ? (
                <>Bloqueia em <span className="font-semibold text-foreground">{formatMMSS(remaining)}</span></>
            ) : (
                <span className="text-amber-600 font-medium">Bloqueando…</span>
            )}
        </p>
    );
}

export function SecurityForm({ initialAutoLock = 15, initialPrivacyMode = false, initialRegistrationOpen = true }: SecurityFormProps) {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [registrationOpen, setRegistrationOpenState] = useState(initialRegistrationOpen);
    const [savingReg, setSavingReg] = useState(false);

    const toggleRegistration = async (next: boolean) => {
        setRegistrationOpenState(next); // otimista
        setSavingReg(true);
        try {
            await setRegistrationPolicy(next);
            toast.success(next ? "Cadastro de novas contas ATIVADO." : "Cadastro de novas contas DESATIVADO.");
        } catch {
            setRegistrationOpenState(!next); // reverte
            toast.error("Não foi possível salvar a política de cadastro.");
        } finally {
            setSavingReg(false);
        }
    };

    // Estados para Senha
    const [current, setCurrent] = useState("");
    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");

    // Medidor de força (puramente visual; o servidor é a fonte da verdade).
    const strength = passwordStrength(pass);

    // Estados para Preferências
    // Inicializamos com as props, mas o useEffect garante a sincronia futura
    const [autoLock, setAutoLock] = useState([initialAutoLock]);
    const [privacyMode, setPrivacyMode] = useState(initialPrivacyMode);

    // ✅ EFEITO DE SINCRONIZAÇÃO:
    // Se o banco mudar (após um save + refresh), atualiza o visual dos inputs
    useEffect(() => {
        setAutoLock([initialAutoLock]);
        setPrivacyMode(initialPrivacyMode);
    }, [initialAutoLock, initialPrivacyMode]);

    // Handler de Senha
    const handlePasswordSubmit = async (formData: FormData) => {
        if (!current) {
            toast.error("Informe sua senha atual.");
            return;
        }
        if (pass !== confirm) {
            toast.error("As senhas não coincidem.");
            return;
        }
        const check = validatePasswordStrength(pass);
        if (!check.valid) {
            toast.error(check.message!);
            return;
        }

        setLoading(true);
        try {
            await changePassword(formData);
            // O servidor encerrou a sessão; reentramos com a nova senha.
            toast.success("Senha atualizada! Faça login novamente com a nova senha.");
            setCurrent("");
            setPass("");
            setConfirm("");
            setTimeout(() => { window.location.href = "/login"; }, 1500);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao atualizar senha.");
        } finally {
            setLoading(false);
        }
    };

    // Bloqueia a tela imediatamente (o SecurityProvider escuta este evento).
    const lockNow = () => {
        window.dispatchEvent(new Event("life-os:lock"));
        toast.success("Sistema bloqueado.");
    };

    // Handler de Preferências (CORRIGIDO E OTIMIZADO)
    const handlePreferences = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("autoLockMinutes", autoLock[0].toString());
            // Envia "on" apenas se estiver true, caso contrário o backend recebe null/undefined
            formData.append("privacyMode", privacyMode ? "on" : "off");
            
            await updateSecurityPreferences(formData);
            
            toast.success("Preferências salvas!", {
                description: `Bloqueio: ${autoLock[0]} min | Privacidade: ${privacyMode ? "Ativo" : "Inativo"}`
            });

            // 🚀 FORÇA O NEXT.JS A REBUSCAR DADOS NO SERVIDOR
            // Isso atualiza as props 'initialAutoLock' e dispara o useEffect acima
            router.refresh(); 
        } catch (e) {
            toast.error("Erro ao salvar preferências.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* CARTÃO 1: ALTERAR SENHA */}
            <Card className="border-destructive/20 bg-card shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-destructive" /> 
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-base">
                        <ShieldCheck className="h-5 w-5 text-destructive" /> Credenciais de Acesso
                    </CardTitle>
                    <CardDescription>Gerencie a senha mestra que protege todo o sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handlePasswordSubmit} className="space-y-5">
                        
                        <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10 flex gap-3 items-start">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                                <span className="font-bold text-destructive block mb-0.5">Zona de Risco</span>
                                Exige sua senha atual. Ao trocar, você será desconectado e precisará
                                entrar novamente com a nova senha.
                            </div>
                        </div>

                        {/* Senha atual (obrigatória) */}
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Senha Atual</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="currentPassword"
                                    name="currentPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={current}
                                    onChange={(e) => setCurrent(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="newPassword" 
                                        name="newPassword" 
                                        type={showPassword ? "text" : "password"} 
                                        value={pass}
                                        onChange={(e) => setPass(e.target.value)}
                                        required 
                                        placeholder="••••••••" 
                                        autoComplete="new-password"
                                        className="pl-9 pr-10" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {pass ? (
                                    <div className="space-y-1 pt-0.5">
                                        <div className="flex gap-1">
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "h-1 flex-1 rounded-full transition-colors",
                                                        i < strength.score ? strength.barColor : "bg-muted"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <p className={cn("text-[11px] font-medium", strength.textColor)}>
                                            Força: {strength.label}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground">Mín. 8 caracteres, com letras e números.</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="confirmPassword" 
                                        type={showPassword ? "text" : "password"} 
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required 
                                        placeholder="••••••••" 
                                        autoComplete="new-password"
                                        className={cn("pl-9", pass && confirm && pass !== confirm ? "border-destructive focus-visible:ring-destructive" : "")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" variant="destructive" disabled={loading || !pass} className="gap-2">
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? "Atualizando..." : "Atualizar Senha"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* CARTÃO 2: PREFERÊNCIAS DE PRIVACIDADE */}
            <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" /> Privacidade & Bloqueio
                    </CardTitle>
                    <CardDescription>Comportamento do sistema quando você está ausente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Bloqueio Automático */}
                    <div className="flex items-center justify-between space-x-4 border p-3 rounded-lg bg-muted/20">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-background rounded-full border shadow-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium leading-none">Bloqueio Automático</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tempo de inatividade até exigir senha novamente.
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-sm font-bold font-mono text-primary">{autoLock[0]} min</span>
                            <LockCountdownBadge minutes={autoLock[0]} />
                        </div>
                    </div>
                    <div className="px-2">
                        <Slider 
                            value={autoLock} 
                            onValueChange={setAutoLock} 
                            max={60} 
                            min={5} 
                            step={5} 
                            className="py-4 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground px-1 select-none">
                            <span>5 min</span>
                            <span>30 min</span>
                            <span>60 min</span>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Modo Privacidade */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                <EyeClosedIcon className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="privacy-mode" className="text-sm font-medium cursor-pointer">Modo Discreto (Blur)</Label>
                            </div>
                            <span className="text-xs text-muted-foreground pl-6">
                                Inicia o sistema com valores monetários borrados por padrão.
                            </span>
                        </div>
                        <Switch 
                            id="privacy-mode" 
                            checked={privacyMode}
                            onCheckedChange={setPrivacyMode}
                        />
                    </div>

                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border py-3 px-6 flex items-center justify-between gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={lockNow} className="gap-2">
                        <Lock className="h-3.5 w-3.5" /> Bloquear agora
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handlePreferences} className="gap-2" disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Salvar Preferências
                    </Button>
                </CardFooter>
            </Card>

            {/* CARTÃO 3: ACESSO AO SISTEMA (cadastro aberto) */}
            <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" /> Acesso ao Sistema
                    </CardTitle>
                    <CardDescription>Controle quem pode criar conta nesta instância.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="reg-open" className="text-sm font-medium cursor-pointer">
                                Permitir novos cadastros
                            </Label>
                            <span className="text-xs text-muted-foreground max-w-md">
                                Ligado: qualquer pessoa com o link pode criar conta em <code>/register</code>
                                {" "}(útil para deixar um amigo testar). Desligado: uso pessoal — só você entra.
                            </span>
                        </div>
                        <Switch
                            id="reg-open"
                            checked={registrationOpen}
                            disabled={savingReg}
                            onCheckedChange={toggleRegistration}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}