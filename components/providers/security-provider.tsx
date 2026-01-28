"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LockScreen } from "@/components/lock-screen";
import { usePathname } from "next/navigation";

interface SecuritySettings {
    autoLockMinutes: number;
    privacyMode: boolean;
}

export function SecurityProvider({ 
    children, 
    initialSettings 
}: { 
    children: React.ReactNode;
    initialSettings: SecuritySettings;
}) {
    // ✅ CORREÇÃO 1: Lazy Initialization
    // O estado já nasce com o valor do localStorage, evitando o setState dentro do useEffect
    const [isLocked, setIsLocked] = useState(() => {
        // Verifica se estamos no navegador (para não quebrar no servidor)
        if (typeof window !== 'undefined') {
            return localStorage.getItem("life-os-locked") === "true";
        }
        return false;
    });

    const pathname = usePathname();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(0); 

    // ✅ CORREÇÃO 2: useEffect agora só cuida do Timer (não seta estado inicial)
    useEffect(() => {
        lastActivityRef.current = Date.now();
    }, []);

    const lockSystem = useCallback(() => {
        // Proteção: Não bloqueia Home, Login ou Setup
        if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/setup")) {
            return; 
        }
        
        setIsLocked(true);
        localStorage.setItem("life-os-locked", "true");
    }, [pathname]);

    const resetTimer = useCallback(() => {
        if (isLocked) return;
        
        lastActivityRef.current = Date.now();
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        const ms = initialSettings.autoLockMinutes * 60 * 1000;
        
        timeoutRef.current = setTimeout(() => {
            lockSystem();
        }, ms);
    }, [initialSettings.autoLockMinutes, isLocked, lockSystem]);

    useEffect(() => {
        if (isLocked) return;

        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        
        let wait = false;
        const handleActivity = () => {
            if (!wait) {
                resetTimer();
                wait = true;
                setTimeout(() => { wait = false }, 1000);
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer(); 

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [resetTimer, isLocked]);

    useEffect(() => {
        if (initialSettings.privacyMode) {
            document.body.classList.add("privacy-mode-active");
        } else {
            document.body.classList.remove("privacy-mode-active");
        }
    }, [initialSettings.privacyMode]);

    return (
        <>
            {isLocked && (
                <LockScreen onUnlock={() => {
                    setIsLocked(false);
                    localStorage.removeItem("life-os-locked");
                    resetTimer();
                }} />
            )}
            
            {/* Adicionei 'suppressHydrationWarning' aqui para evitar erro no console 
                já que o servidor renderiza desbloqueado e o cliente pode renderizar bloqueado */}
            <div 
                suppressHydrationWarning
                className={isLocked ? "blur-md pointer-events-none select-none h-screen overflow-hidden" : ""}
            >
                {children}
            </div>
        </>
    );
}