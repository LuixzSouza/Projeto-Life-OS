"use client";

import { 
  Settings, 
  User, 
  Palette, 
  Key, 
  Database, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Save, 
  HardDrive,
  RefreshCw,
  Server
} from "lucide-react";
import { BaseCard } from "./base-card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- TIPOS ---
type Tab = "profile" | "appearance" | "api" | "database";

export function SettingsCard() {
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  
  // Estados de Configuração
  const [darkMode, setDarkMode] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [activeColor, setActiveColor] = useState("emerald");
  const [showKey, setShowKey] = useState<string | null>(null);

  // Temas
  const themes = [
    { id: "zinc", class: "bg-zinc-200", glow: "from-zinc-500/20" },
    { id: "indigo", class: "bg-indigo-500", glow: "from-indigo-500/20" },
    { id: "emerald", class: "bg-emerald-500", glow: "from-emerald-500/20" },
    { id: "rose", class: "bg-rose-500", glow: "from-rose-500/20" },
    { id: "orange", class: "bg-orange-500", glow: "from-orange-500/20" },
  ];

  // Menu Lateral
  const menuItems = [
    { id: "profile", icon: User, label: "Perfil" },
    { id: "appearance", icon: Palette, label: "Visual" },
    { id: "api", icon: Key, label: "Chaves" },
    { id: "database", icon: Database, label: "Dados" },
  ];

  const currentGlow = themes.find(t => t.id === activeColor)?.glow || "from-emerald-500/20";

  return (
    <BaseCard 
        title="Painel de Controle" 
        icon={Settings} 
        description="Sistema & Preferências."
        className="col-span-2 md:col-span-2 min-h-[260px]"
    >
        {/* Glow de Fundo */}
        <div className={cn("absolute inset-0 bg-gradient-to-tr to-transparent opacity-20 transition-colors duration-700 pointer-events-none", currentGlow)} />

        <div className="flex h-full w-full bg-[#09090b]">
            
            {/* --- SIDEBAR DE NAVEGAÇÃO --- */}
            <div className="w-[70px] border-r border-white/5 flex flex-col items-center py-4 gap-4 bg-zinc-900/30 z-20">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as Tab)}
                            className={cn(
                                "p-2.5 rounded-xl transition-all duration-300 relative group",
                                isActive ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            )}
                            title={item.label}
                        >
                            <Icon className="h-5 w-5" />
                            {isActive && (
                                <motion.div 
                                    layoutId="active-tab-indicator"
                                    className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full"
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* --- CONTEÚDO DINÂMICO --- */}
            <div className="flex-1 p-5 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    
                    {/* 1. ABA APARÊNCIA (O que você já gostou) */}
                    {activeTab === "appearance" && (
                        <motion.div 
                            key="appearance"
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-6 h-full justify-center"
                        >
                            {/* Toggles */}
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setDarkMode(!darkMode)}>
                                    <div className={cn("w-10 h-6 rounded-full p-1 flex items-center transition-colors", darkMode ? "bg-zinc-700" : "bg-zinc-300")}>
                                        <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400">{darkMode ? "Dark Mode" : "Light Mode"}</span>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSoundOn(!soundOn)}>
                                    <div className={cn("w-10 h-6 rounded-full p-1 flex items-center transition-colors", soundOn ? "bg-emerald-500" : "bg-zinc-800 border border-zinc-700")}>
                                        <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", soundOn ? "bg-white" : "bg-zinc-500")} />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400">Sons</span>
                                </div>
                            </div>

                            {/* Cores */}
                            <div className="space-y-2">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Cor de Destaque</span>
                                <div className="flex gap-3">
                                    {themes.map((theme) => (
                                        <button 
                                            key={theme.id}
                                            onClick={() => setActiveColor(theme.id)}
                                            className={cn(
                                                "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                                theme.class,
                                                activeColor === theme.id ? "ring-2 ring-white ring-offset-2 ring-offset-[#09090b]" : "opacity-60"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 2. ABA CHAVES API (Gestão de Conexões) */}
                    {activeTab === "api" && (
                        <motion.div 
                            key="api"
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-3 h-full"
                        >
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Chaves de API</h3>
                            
                            {["OpenAI (GPT-4)", "Anthropic (Claude)", "Database (Supabase)"].map((label, i) => (
                                <div key={i} className="space-y-1">
                                    <label className="text-[10px] text-zinc-500">{label}</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 h-8 bg-zinc-800/50 border border-white/5 rounded-lg flex items-center px-3 relative">
                                            <input 
                                                type={showKey === String(i) ? "text" : "password"} 
                                                value="sk-89210391203912039"
                                                disabled
                                                className="bg-transparent border-none outline-none text-xs text-zinc-300 w-full font-mono"
                                            />
                                            <button 
                                                onClick={() => setShowKey(showKey === String(i) ? null : String(i))}
                                                className="absolute right-2 text-zinc-500 hover:text-white"
                                            >
                                                {showKey === String(i) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                            </button>
                                        </div>
                                        <button className="h-8 w-8 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/50 rounded-lg flex items-center justify-center text-indigo-400">
                                            <Save className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* 3. ABA BANCO DE DADOS (Status do Sistema) */}
                    {activeTab === "database" && (
                        <motion.div 
                            key="database"
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-4 h-full justify-center"
                        >
                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-lg text-black">
                                        <Server className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-emerald-400">PostgreSQL (Prisma)</span>
                                        <span className="text-[10px] text-emerald-600/80">Status: Operacional</span>
                                    </div>
                                </div>
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            </div>

                            {/* Storage Usage */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> Armazenamento</span>
                                    <span className="text-zinc-200">1.2 GB / 5 GB</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full w-[24%] bg-indigo-500 rounded-full" />
                                </div>
                            </div>

                            <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                                <RefreshCw className="h-3 w-3" /> Fazer Backup Agora
                            </button>
                        </motion.div>
                    )}

                    {/* 4. ABA PERFIL */}
                    {activeTab === "profile" && (
                        <motion.div 
                            key="profile"
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-4 h-full justify-center items-center"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
                                    <div className="w-full h-full rounded-full bg-zinc-900 border-2 border-transparent flex items-center justify-center text-xl font-bold text-white">
                                        LA
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-[#09090b] rounded-full" />
                            </div>
                            
                            <div className="text-center space-y-1 w-full">
                                <input 
                                    value="Luiz Antônio" 
                                    className="bg-transparent text-center text-sm font-bold text-white border-b border-transparent hover:border-zinc-700 focus:border-indigo-500 outline-none w-full transition-colors pb-1"
                                />
                                <p className="text-[10px] text-zinc-500">Fullstack Developer</p>
                            </div>

                            <div className="flex gap-2 w-full">
                                <button className="flex-1 py-1.5 bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-white transition-colors">Editar Bio</button>
                                <button className="flex-1 py-1.5 bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-white transition-colors">Logout</button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

        </div>
    </BaseCard>
  );
}