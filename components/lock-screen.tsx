"use client";

import { useState, useEffect, useRef } from "react";
import { verifyMasterPassword } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LockScreenProps {
    onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    
    // 1. CONTROLE DE HIDRATAÇÃO SEGURO
    const [mounted, setMounted] = useState(false);
    const lockRef = useRef<HTMLDivElement>(null);

    // Resolvemos o erro de "Cascading renders" jogando o setState para o fim da fila de execução
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // 2. ARMADURA ANTI-SABOTAGEM
    useEffect(() => {
        // Só liga a armadura se o componente já estiver montado E a div do cofre já existir na tela
        if (!mounted || !lockRef.current) return;

        // A. Bloqueia o Menu de Contexto (Botão Direito)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // B. Bloqueia atalhos de DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
        const handleKeyDown = (e: KeyboardEvent) => {
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

        // Liga as defesas
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        observer.observe(document.body, { childList: true, subtree: true });

        // Desliga as defesas quando o usuário destravar
        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            observer.disconnect();
        };
    }, [mounted]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;
        
        setLoading(true);
        setIsError(false);

        const res = await verifyMasterPassword(password);
        
        if (res.success) {
            toast.dismiss(); 
            toast.success("Acesso Autorizado.");
            onUnlock();
        } else {
            toast.error("Credencial Inválida. Acesso Negado.");
            setPassword("");
            setIsError(true);
            setTimeout(() => setIsError(false), 1000);
        }
        setLoading(false);
    };

    // Evita o erro de SSR retornando null até o navegador assumir o controle
    if (!mounted) return null;

    return (
        <div ref={lockRef} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-500">
            
            {/* FUNDO (BLUR PESADO + GRID) */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* COFRE / MODAL PRINCIPAL */}
            <div className={cn(
                "relative w-full max-w-[400px] bg-background/80 border border-border/40 shadow-2xl rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl transition-all duration-300",
                isError && "border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)] scale-[0.98]"
            )}>
                
                <div className="flex flex-col items-center text-center space-y-5 mb-8">
                    <div className="relative">
                        <div className={cn(
                            "absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse",
                            isError ? "bg-rose-500" : "bg-primary"
                        )} />
                        <div className={cn(
                            "relative h-16 w-16 rounded-2xl flex items-center justify-center border shadow-inner transition-colors duration-300",
                            isError ? "bg-rose-500/10 border-rose-500/50 text-rose-500" : "bg-primary/10 border-primary/20 text-primary"
                        )}>
                            {isError ? <ShieldAlert className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Protocolo de Segurança
                        </h2>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                            Sistema Bloqueado
                        </h1>
                        <p className="text-xs text-muted-foreground/80 font-medium px-4">
                            A sessão foi pausada. O console de desenvolvedor e interações não autorizadas foram desativados.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUnlock} className="space-y-6">
                    <div className="space-y-2">
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className={cn(
                                "h-14 rounded-2xl bg-muted/20 border-border/50 text-center tracking-[0.5em] font-mono text-xl transition-all duration-300",
                                "focus-visible:ring-2 placeholder:tracking-normal",
                                isError ? "focus-visible:ring-rose-500/50 border-rose-500/50 text-rose-500" : "focus-visible:ring-primary/50 text-foreground"
                            )}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setIsError(false); 
                            }}
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={loading || !password}
                        className={cn(
                            "w-full h-14 rounded-full font-black uppercase tracking-widest text-[11px] shadow-lg transition-all duration-300",
                            isError ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" : "bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02]"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                Decodificar Acesso <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}