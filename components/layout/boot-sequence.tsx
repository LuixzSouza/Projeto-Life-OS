"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal, Cpu, ShieldCheck, Database, Lock, LucideIcon, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Import do Toast

// Lista de Logs de Inicialização
const LOGS = [
    { text: "BIOS CHECK .......................... OK", delay: 100 },
    { text: "LOADING KERNEL V4.2.0 ............... OK", delay: 300 },
    { text: "MOUNTING FILE SYSTEM (ZFS) .......... OK", delay: 600 },
    { text: "ESTABLISHING SECURE CONNECTION ...... OK", delay: 1000 },
    { text: "DECRYPTING USER DATA ................ OK", delay: 1400 },
    { text: "INITIALIZING NEURAL INTERFACE ....... OK", delay: 1800 },
];

// Tipagem das Props
interface BootSequenceProps {
    dbStatus: string;
}

interface StatusItemProps {
    icon: LucideIcon;
    label: string;
    value: string;
}

export function BootSequence({ dbStatus }: BootSequenceProps) {
    const router = useRouter();
    const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
    const [showButton, setShowButton] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isEntering, setIsEntering] = useState(false); // Novo estado de Loading

    // Efeito de digitação dos logs (Lógica Segura)
    useEffect(() => {
        if (dbStatus !== 'ONLINE') return;

        let currentIndex = 0;
        
        const interval = setInterval(() => {
            if (currentIndex < LOGS.length) {
                const currentLog = LOGS[currentIndex];
                setVisibleLogs(prev => [...prev, currentLog.text]);
                const newProgress = ((currentIndex + 1) / LOGS.length) * 100;
                setProgress(newProgress);
                currentIndex++;
            } else {
                clearInterval(interval);
                setTimeout(() => setShowButton(true), 500);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [dbStatus]);

    const handleEnter = () => {
        if (isEntering) return; // Previne duplo clique
        
        setIsEntering(true);
        toast.success("ACCESS GRANTED. WELCOME BACK, ADMIN."); // Feedback sonoro/visual

        // Efeito visual de desligar (Fade Out)
        const body = document.querySelector('body');
        if (body) {
            body.style.transition = 'opacity 1.2s ease-in-out';
            body.style.opacity = '0';
        }

        // Aguarda a animação e o toast antes de recarregar a rota
        setTimeout(() => {
            window.location.href = "/dashboard"; 
        }, 1200);
    };

    if (dbStatus === 'CRITICAL_ERROR') {
        return (
            <div className="border border-red-500/50 bg-red-950/20 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(239,68,68,0.2)] max-w-lg w-full backdrop-blur-md">
                <h1 className="text-4xl font-bold text-red-500 mb-4 tracking-widest font-mono">SYSTEM FAILURE</h1>
                <p className="text-red-300 font-mono">Unable to connect to database core.</p>
                <p className="text-red-400/50 text-xs mt-4 font-mono">ERROR_CODE: 0xDB_TIMEOUT</p>
                <Button 
                    variant="outline" 
                    className="mt-6 border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-mono tracking-widest" 
                    onClick={() => window.location.reload()}
                >
                    RETRY CONNECTION
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg transition-opacity duration-1000 ease-in">
            {/* Terminal Window */}
            <div className="bg-black/80 border border-green-800 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm relative group">
                
                {/* Header do Terminal */}
                <div className="flex items-center justify-between px-4 py-2 bg-green-950/30 border-b border-green-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold tracking-widest uppercase">
                        <Lock className="w-3 h-3" /> SECURE_BOOT_LOADER
                    </div>
                </div>

                {/* Área de Conteúdo */}
                <div className="p-6 font-mono text-sm min-h-[320px] flex flex-col relative">
                    
                    {/* Grid de Status */}
                    <div className="grid grid-cols-2 gap-4 mb-8 border-b border-green-900/30 pb-6">
                         <StatusItem icon={Cpu} label="CPU" value="12% / 3.2GHz" />
                         <StatusItem icon={Database} label="MEMORY" value="OPTIMIZED" />
                         <StatusItem icon={ShieldCheck} label="FIREWALL" value="ACTIVE" />
                         <StatusItem icon={Terminal} label="KERNEL" value="V.1.0.4" />
                    </div>

                    {/* Logs de Texto */}
                    <div className="flex-1 space-y-1.5">
                        {visibleLogs.map((line, i) => (
                            <div key={i} className="flex items-center text-green-400/90 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="mr-3 text-green-600 text-xs">[{formatTime()}]</span>
                                {line}
                            </div>
                        ))}
                        {visibleLogs.length < LOGS.length && (
                            <div className="animate-pulse text-green-500 font-bold">_</div>
                        )}
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mt-6 h-1 w-full bg-green-900/30 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-green-500 shadow-[0_0_10px_#22c55e] transition-all duration-300 ease-out" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                </div>
            </div>

            {/* Botão de Ação (Aparece no final) */}
            <div className={`mt-8 transition-all duration-700 transform ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Button 
                    onClick={handleEnter}
                    disabled={isEntering}
                    className="w-full h-14 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-black font-bold text-lg tracking-[0.2em] border border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all group active:scale-95"
                >
                    {isEntering ? (
                        <span className="flex items-center gap-3 animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" /> AUTHENTICATING...
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            ACCESS SYSTEM <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}

// Componente Tipado Corretamente
function StatusItem({ icon: Icon, label, value }: StatusItemProps) {
    return (
        <div className="flex items-center gap-3 text-green-500/60 transition-colors hover:text-green-400">
            <Icon className="w-4 h-4" />
            <div className="flex flex-col">
                <span className="text-[9px] font-bold tracking-wider opacity-70">{label}</span>
                <span className="text-xs text-green-400 font-medium">{value}</span>
            </div>
        </div>
    )
}

function formatTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}