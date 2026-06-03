"use client";

import { Key, Lock, Unlock, Fingerprint, ShieldCheck, Copy, Check } from "lucide-react";
import { BaseCard } from "./base-card";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// model AccessItem: title, username, password, category.
interface Credential {
  id: string;
  service: string;
  username: string;
  pass: string;
  icon: string;
}

const CREDENTIALS: Credential[] = [
  { id: "1", service: "Google (Principal)", username: "luiz.dev@gmail.com", pass: "Goo_##992", icon: "G" },
  { id: "2", service: "AWS Console", username: "root-luiz", pass: "aws-x82-live", icon: "A" },
  { id: "3", service: "Cliente · Studio Aurora", username: "admin", pass: "aurora-2026", icon: "S" },
  { id: "4", service: "Vercel", username: "luiz", pass: "vercel_vibe", icon: "V" },
];

export function VaultCard() {
  const [locked, setLocked] = useState(true);
  const [displayText, setDisplayText] = useState("••••••••••••");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const TARGET_TEXT = "ACCESS_GRANTED";
  const CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const unlockVault = () => {
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText((prev) =>
        prev
          .split("")
          .map((_, index) => (index < iteration ? TARGET_TEXT[index] : CHARS[Math.floor(Math.random() * CHARS.length)]))
          .join("")
      );
      if (iteration >= TARGET_TEXT.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setLocked(false), 500);
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
    <BaseCard title="Acessos" icon={Key} description="Cofre criptografado (keyring)." className="col-span-1 min-h-[260px]">
      <div className="relative h-full w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {locked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4"
              onClick={unlockVault}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                <div className="relative rounded-2xl border border-border/60 bg-card p-4 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <Lock className="size-8 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <div className="absolute -right-1 -top-1 rounded-full border border-border/60 bg-card p-1">
                  <ShieldCheck className="size-3 text-primary" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 min-w-[140px] items-center justify-center rounded-lg border border-border/60 bg-background/40 px-4 font-mono text-sm tracking-widest text-muted-foreground">
                  {displayText}
                </div>
                <div className="flex items-center gap-1.5 opacity-60">
                  <Fingerprint className="size-3 text-muted-foreground" />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Clique para autenticar</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="unlocked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-0 flex flex-col">
              <div className="flex items-center justify-between border-b border-border/60 bg-primary/5 px-4 py-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Unlock className="size-3" /> Desbloqueado
                </span>
                <button onClick={lockVault} className="text-[9px] text-muted-foreground underline hover:text-foreground">
                  Bloquear
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
                {CREDENTIALS.map((cred) => (
                  <div key={cred.id} className="group flex items-center justify-between rounded-lg bg-primary/[0.04] p-2 transition-colors hover:bg-primary/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="grid size-8 place-items-center rounded-md border border-border/60 bg-muted text-xs font-bold text-primary">
                        {cred.icon}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium text-foreground">{cred.service}</span>
                        <span className="truncate text-[9px] text-muted-foreground">{cred.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(cred.pass, cred.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Copiar senha"
                    >
                      {copiedId === cred.id ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner */}
        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ top: "-10%" }}
              animate={{ top: "110%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              className="pointer-events-none absolute h-[10px] w-full bg-primary/20 blur-md"
            />
          )}
        </AnimatePresence>
      </div>
    </BaseCard>
  );
}
