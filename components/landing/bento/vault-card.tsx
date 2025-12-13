"use client";

import { Key, Lock, Unlock, Fingerprint, ShieldCheck, Copy, Check, Eye, EyeOff } from "lucide-react";
import { BaseCard } from "./base-card";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- TIPOS ---
interface Credential {
  id: string;
  service: string;
  username: string;
  pass: string; // Na vida real, isso viria criptografado
  icon: string; // Inicial ou URL
}

const CREDENTIALS: Credential[] = [
  { id: "1", service: "Google (Principal)", username: "luiz.dev@gmail.com", pass: "Goo_##992", icon: "G" },
  { id: "2", service: "AWS Console", username: "root-luiz", pass: "aws-x82-live", icon: "A" },
  { id: "3", service: "Netflix", username: "familia_souza", pass: "pipoca2025", icon: "N" },
  { id: "4", service: "Spotify", username: "luiz_music", pass: "spotify_vibe", icon: "S" },
];

export function VaultCard() {
  const [locked, setLocked] = useState(true);
  const [displayText, setDisplayText] = useState("••••••••••••");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const TARGET_TEXT = "ACCESS_GRANTED";
  const CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // --- EFEITO MATRIX (DESBLOQUEIO) ---
  const unlockVault = () => {
    let iteration = 0;
    clearInterval(intervalRef.current as NodeJS.Timeout);

    intervalRef.current = setInterval(() => {
      setDisplayText((prev) =>
        prev.split("").map((_, index) => {
            if (index < iteration) return TARGET_TEXT[index];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );

      if (iteration >= TARGET_TEXT.length) {
        clearInterval(intervalRef.current as NodeJS.Timeout);
        setTimeout(() => setLocked(false), 500); // Abre o cofre após o efeito
      }
      iteration += 1 / 2;
    }, 30);
  };

  const lockVault = () => {
    setLocked(true);
    setDisplayText("••••••••••••");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <BaseCard 
        title="Cofre de Senhas" 
        icon={Key} 
        description="Gerenciador criptografado."
        className="col-span-1 min-h-[260px]"
    >
        <div className="relative w-full h-full bg-[#09090b] overflow-hidden">
            
            <AnimatePresence mode="wait">
                
                {/* --- ESTADO 1: BLOQUEADO (SUA ANIMAÇÃO) --- */}
                {locked ? (
                    <motion.div 
                        key="locked"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer group"
                        onClick={unlockVault} // Agora clica para abrir
                    >
                        {/* Ícone Pulsante */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative group-hover:scale-105 transition-transform duration-300">
                                <Lock className="h-8 w-8 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-800">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            </div>
                        </div>

                        {/* Texto Matrix */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="h-8 px-4 flex items-center justify-center rounded-lg bg-black/40 border border-white/5 font-mono text-sm text-zinc-500 tracking-widest min-w-[140px]">
                                {displayText}
                            </div>
                            <div className="flex items-center gap-1.5 opacity-50">
                                <Fingerprint className="h-3 w-3 text-zinc-600" />
                                <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                                    Clique para Autenticar
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    
                    /* --- ESTADO 2: DESBLOQUEADO (LISTA DE SENHAS) --- */
                    <motion.div 
                        key="unlocked"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 flex flex-col"
                    >
                        {/* Header Interno */}
                        <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-emerald-900/10">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                                <Unlock className="h-3 w-3" /> Desbloqueado
                            </span>
                            <button onClick={lockVault} className="text-[9px] text-zinc-500 hover:text-zinc-300 underline">
                                Bloquear
                            </button>
                        </div>

                        {/* Lista de Credenciais */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {CREDENTIALS.map((cred) => (
                                <div key={cred.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-white/5">
                                            {cred.icon}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-medium text-zinc-200 truncate">{cred.service}</span>
                                            <span className="text-[9px] text-zinc-500 truncate">{cred.username}</span>
                                        </div>
                                    </div>

                                    {/* Botão Copiar */}
                                    <button 
                                        onClick={() => copyToClipboard(cred.pass, cred.id)}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-white transition-colors relative"
                                        title="Copiar Senha"
                                    >
                                        {copiedId === cred.id ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Efeito Scanner (Só aparece na transição ou bloqueado) */}
            <AnimatePresence>
                {locked && (
                    <motion.div 
                        initial={{ top: "-10%" }}
                        animate={{ top: "110%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                        className="absolute w-full h-[10px] bg-emerald-500/20 blur-md pointer-events-none"
                    />
                )}
            </AnimatePresence>

        </div>
    </BaseCard>
  );
}