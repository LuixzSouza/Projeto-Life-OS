"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { changePassword, updateSecurityPreferences } from "@/app/(dashboard)/settings/actions";
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
    Loader2
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Interface para receber os dados do banco
interface SecurityFormProps {
    initialAutoLock?: number;
    initialPrivacyMode?: boolean;
}

export function SecurityForm({ initialAutoLock = 15, initialPrivacyMode = false }: SecurityFormProps) {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Estados para Senha
    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");

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
        if (pass !== confirm) {
            toast.error("As senhas não coincidem.");
            return;
        }
        if (pass.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await changePassword(formData);
            toast.success("Senha mestra atualizada com sucesso!");
            setPass("");
            setConfirm("");
        } catch (e) {
            toast.error("Erro ao atualizar senha.");
        } finally {
            setLoading(false);
        }
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
                                Alterar a senha desconectará todas as sessões ativas imediatamente.
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
                        <div className="w-[140px] text-right">
                            <span className="text-sm font-bold font-mono text-primary">{autoLock[0]} min</span>
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
                <CardFooter className="bg-muted/30 border-t border-border py-3 px-6 flex justify-end">
                    <Button variant="secondary" size="sm" onClick={handlePreferences} className="gap-2" disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Salvar Preferências
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}