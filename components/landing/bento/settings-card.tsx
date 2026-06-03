"use client";

import {
  Settings, User, Palette, Key, Database, Eye, EyeOff, Save, HardDrive, RefreshCw, Bot, Lock,
} from "lucide-react";
import { BaseCard } from "./base-card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "profile" | "appearance" | "api" | "database";

// Presets reais do accent dinâmico (mesmas cores do globals.css / data-theme).
const PRESETS = [
  { id: "blue", color: "oklch(0.55 0.20 260)" },
  { id: "green", color: "oklch(0.55 0.18 145)" },
  { id: "orange", color: "oklch(0.60 0.18 35)" },
  { id: "violet", color: "oklch(0.55 0.22 280)" },
  { id: "rose", color: "oklch(0.55 0.20 350)" },
];

// model Settings.aiProvider / chaves (openaiKey, groqKey, googleKey...).
const AI_KEYS = ["OpenAI (GPT-4o)", "Groq (Llama)", "Gemini (Google)"];

export function SettingsCard() {
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  const [darkMode, setDarkMode] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const [accent, setAccent] = useState("blue");
  const [showKey, setShowKey] = useState<string | null>(null);

  const menuItems = [
    { id: "profile", icon: User, label: "Perfil" },
    { id: "appearance", icon: Palette, label: "Visual" },
    { id: "api", icon: Key, label: "IA & Chaves" },
    { id: "database", icon: Database, label: "Dados" },
  ] as const;

  return (
    <BaseCard title="Configurações" icon={Settings} description="Sistema e preferências." className="col-span-2 md:col-span-2 min-h-[260px]">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="z-20 flex w-[70px] flex-col items-center gap-3 border-r border-border/60 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative rounded-xl p-2.5 transition-all duration-300",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                )}
                title={item.label}
              >
                <Icon className="size-5" />
                {isActive && <motion.div layoutId="active-settings-tab" className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="relative flex-1 overflow-hidden p-5">
          <AnimatePresence mode="wait">
            {activeTab === "appearance" && (
              <motion.div key="appearance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex h-full flex-col justify-center gap-6">
                <div className="flex items-center gap-8">
                  <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-10 items-center rounded-full p-1 transition-colors", darkMode ? "bg-primary" : "bg-muted")}>
                      <motion.div layout className="size-4 rounded-full bg-background shadow-sm" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{darkMode ? "Dark" : "Light"}</span>
                  </button>
                  <button onClick={() => setPrivacy(!privacy)} className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-10 items-center rounded-full p-1 transition-colors", privacy ? "bg-primary" : "bg-muted")}>
                      <motion.div layout className="size-4 rounded-full bg-background shadow-sm" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Privacidade</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accent (sorteado na landing)</span>
                  <div className="flex gap-3">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setAccent(p.id)}
                        style={{ backgroundColor: p.color }}
                        className={cn(
                          "size-6 rounded-full transition-transform hover:scale-110",
                          accent === p.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-70"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "api" && (
              <motion.div key="api" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex h-full flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">IA híbrida — chaves</h3>
                </div>
                {AI_KEYS.map((label, i) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">{label}</label>
                    <div className="flex gap-2">
                      <div className="relative flex h-8 flex-1 items-center rounded-lg border border-border/60 bg-muted/50 px-3">
                        <input
                          type={showKey === String(i) ? "text" : "password"}
                          value="sk-89210391203912039"
                          disabled
                          className="w-full border-none bg-transparent font-mono text-xs text-foreground outline-none"
                        />
                        <button onClick={() => setShowKey(showKey === String(i) ? null : String(i))} className="absolute right-2 text-muted-foreground hover:text-primary">
                          {showKey === String(i) ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        </button>
                      </div>
                      <button className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                        <Save className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "database" && (
              <motion.div key="database" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex h-full flex-col justify-center gap-4">
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Database className="size-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">SQLite (Prisma)</span>
                      <span className="text-[10px] text-muted-foreground">~/LifeOS_Data/life-os.db</span>
                    </div>
                  </div>
                  <div className="size-2 animate-pulse rounded-full bg-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HardDrive className="size-3" /> Tamanho do banco
                    </span>
                    <span className="text-foreground">12.4 MB</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[24%] rounded-full bg-gradient-brand" />
                  </div>
                </div>

                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-[10px] font-bold text-primary-foreground transition-all hover:opacity-90">
                  <RefreshCw className="size-3" /> Fazer backup agora
                </button>
              </motion.div>
            )}

            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex h-full flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="size-16 rounded-full bg-gradient-brand p-0.5">
                    <div className="flex size-full items-center justify-center rounded-full bg-card text-xl font-bold text-foreground">LA</div>
                  </div>
                  <div className="absolute bottom-0 right-0 size-5 rounded-full border-2 border-card bg-primary" />
                </div>
                <div className="w-full space-y-1 text-center">
                  <input
                    value="Luiz Antônio"
                    readOnly
                    className="w-full border-b border-transparent bg-transparent pb-1 text-center text-sm font-bold text-foreground outline-none transition-colors hover:border-border focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Fullstack Developer</p>
                </div>
                <div className="flex w-full gap-2">
                  <button className="flex-1 rounded bg-muted py-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">Editar bio</button>
                  <button className="flex flex-1 items-center justify-center gap-1 rounded bg-muted py-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
                    <Lock className="size-2.5" /> Bloquear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BaseCard>
  );
}
