"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LockScreen } from "@/components/lock-screen";
import { usePathname } from "next/navigation";
import { Clock } from "lucide-react";

interface SecuritySettings {
    autoLockMinutes: number;
    privacyMode: boolean;
}

// Quantos segundos antes do bloqueio o aviso de contagem aparece na tela.
const WARN_SECONDS = 20;

export function SecurityProvider({
    children,
    initialSettings,
}: {
    children: React.ReactNode;
    initialSettings: SecuritySettings;
}) {
    // Lazy init a partir do localStorage (evita setState dentro de effect).
    const [isLocked, setIsLocked] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("life-os-locked") === "true";
        }
        return false;
    });
    // Segundos restantes até o bloqueio — só preenchido na janela de aviso.
    const [countdown, setCountdown] = useState<number | null>(null);

    const pathname = usePathname();
    // 0 = ainda não inicializado; Date.now() é chamado dentro de effects (impuro).
    const lastActivityRef = useRef<number>(0);

    // Páginas onde o bloqueio NÃO se aplica (públicas/entrada).
    const isExempt = useCallback(
        () =>
            pathname === "/" ||
            pathname.startsWith("/login") ||
            pathname.startsWith("/register") ||
            pathname.startsWith("/setup"),
        [pathname]
    );

    const lockSystem = useCallback(() => {
        if (isExempt()) return;
        setIsLocked(true);
        setCountdown(null);
        localStorage.setItem("life-os-locked", "true");
    }, [isExempt]);

    const registerActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        setCountdown((c) => (c !== null ? null : c)); // some o aviso ao mexer
    }, []);

    // Escuta atividade do usuário (só atualiza um ref → sem re-render por evento).
    useEffect(() => {
        if (isLocked) return;
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        let throttled = false;
        const handleActivity = () => {
            if (throttled) return;
            registerActivity();
            throttled = true;
            setTimeout(() => {
                throttled = false;
            }, 500);
        };
        events.forEach((e) => window.addEventListener(e, handleActivity));
        lastActivityRef.current = Date.now();
        return () => events.forEach((e) => window.removeEventListener(e, handleActivity));
    }, [isLocked, registerActivity]);

    // Tique de 1s: calcula o tempo restante, mostra a contagem na janela de aviso
    // e bloqueia ao chegar a zero. Mais previsível que um setTimeout único e
    // permite exibir o cronômetro na tela.
    useEffect(() => {
        // Sem setState aqui: quando travado/isento o intervalo simplesmente não
        // roda e o render já esconde o aviso (gate abaixo). Evita cascata de render.
        if (isLocked || isExempt()) return;
        const totalMs = initialSettings.autoLockMinutes * 60 * 1000;
        const id = setInterval(() => {
            if (!lastActivityRef.current) lastActivityRef.current = Date.now();
            const remaining = totalMs - (Date.now() - lastActivityRef.current);
            if (remaining <= 0) {
                lockSystem();
                return;
            }
            const remSec = Math.ceil(remaining / 1000);
            setCountdown(remSec <= WARN_SECONDS ? remSec : null);
        }, 1000);
        return () => clearInterval(id);
    }, [isLocked, isExempt, initialSettings.autoLockMinutes, lockSystem]);

    // Modo Discreto (blur global de valores marcados com .privacy-blur).
    useEffect(() => {
        document.body.classList.toggle("privacy-mode-active", initialSettings.privacyMode);
    }, [initialSettings.privacyMode]);

    // Bloqueio manual ("Bloquear agora"): qualquer parte do app dispara este
    // evento para travar a tela imediatamente, sem esperar o timer.
    useEffect(() => {
        const handler = () => lockSystem();
        window.addEventListener("life-os:lock", handler);
        return () => window.removeEventListener("life-os:lock", handler);
    }, [lockSystem]);

    return (
        <>
            {isLocked && (
                <LockScreen
                    onUnlock={() => {
                        setIsLocked(false);
                        localStorage.removeItem("life-os-locked");
                        registerActivity();
                    }}
                />
            )}

            {/* Aviso de contagem regressiva (aparece nos segundos finais de inatividade) */}
            {!isLocked && !isExempt() && countdown !== null && (
                <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3">
                    <div className="flex items-center gap-3 rounded-full border border-amber-500/30 bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-foreground">
                            Bloqueando em <span className="font-bold tabular-nums text-amber-600">{countdown}s</span>
                        </span>
                        <button
                            type="button"
                            onClick={registerActivity}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            <div
                suppressHydrationWarning
                className={isLocked ? "blur-md pointer-events-none select-none h-screen overflow-hidden" : ""}
            >
                {children}
            </div>
        </>
    );
}
