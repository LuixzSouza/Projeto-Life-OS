"use client";

import { 
  Film, 
  Gamepad2, 
  Tv, 
  Play, 
  Music, 
  ListPlus, 
  Heart,
  LucideIcon
} from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// --- TIPOS ---
type MediaType = "movie" | "game" | "music" | "series";

interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  type: MediaType;
  icon: LucideIcon;
  color: string;
  progress?: number; // 0 a 100
  status: "playing" | "backlog" | "wishlist";
}

// --- DADOS MOCKADOS (Exemplo do seu banco) ---
const MEDIA_DATA: MediaItem[] = [
  // Playing Now
  { id: "1", title: "Dune: Part Two", subtitle: "1h 45m restantes", type: "movie", icon: Film, color: "text-orange-400", progress: 65, status: "playing" },
  { id: "2", title: "Elden Ring", subtitle: "Leyndell, Royal Capital", type: "game", icon: Gamepad2, color: "text-amber-400", progress: 42, status: "playing" },
  
  // Backlog
  { id: "3", title: "The Bear S3", subtitle: "Série • Hulu", type: "series", icon: Tv, color: "text-blue-400", status: "backlog" },
  { id: "4", title: "Cyberpunk 2077", subtitle: "Phantom Liberty", type: "game", icon: Gamepad2, color: "text-yellow-400", status: "backlog" },
  
  // Wishlist
  { id: "5", title: "GTA VI", subtitle: "Lançamento 2025", type: "game", icon: Gamepad2, color: "text-purple-400", status: "wishlist" },
];

export function EntertainmentCard() {
  const [activeTab, setActiveTab] = useState<"playing" | "backlog">("playing");

  // Filtra os dados
  const nowPlaying = MEDIA_DATA.filter(i => i.status === "playing");
  const backlog = MEDIA_DATA.filter(i => i.status === "backlog" || i.status === "wishlist");

  return (
    <BaseCard 
        title="Hub de Mídia" 
        icon={Play} 
        description="Rastreamento de lazer."
        className="col-span-1 h-full"
    >
        <div className="flex flex-col h-full w-full bg-[#09090b] relative">
            
            {/* --- SELETOR DE MODO (Abas Superiores) --- */}
            <div className="flex border-b border-white/5 bg-zinc-900/50">
                <button 
                    onClick={() => setActiveTab("playing")}
                    className={cn(
                        "flex-1 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors border-b-2",
                        activeTab === "playing" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Em Andamento
                </button>
                <button 
                    onClick={() => setActiveTab("backlog")}
                    className={cn(
                        "flex-1 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors border-b-2",
                        activeTab === "backlog" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Fila / Desejos
                </button>
            </div>

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <div className="flex-1 p-3 overflow-y-auto min-h-0 custom-scrollbar">
                <AnimatePresence mode="wait">
                    
                    {/* VISÃO: EM ANDAMENTO (Cards Detalhados) */}
                    {activeTab === "playing" && (
                        <motion.div 
                            key="playing"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col gap-3"
                        >
                            {nowPlaying.map((item) => (
                                <div key={item.id} className="bg-zinc-800/40 rounded-xl p-3 border border-white/5 relative overflow-hidden group">
                                    {/* Arte de Fundo (Blur) */}
                                    <div className={cn("absolute right-0 top-0 w-24 h-24 blur-[40px] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2", item.color.replace("text-", "bg-"))} />
                                    
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-md bg-zinc-900 border border-white/5", item.color)}>
                                                <item.icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-100 leading-none">{item.title}</span>
                                                <span className="text-[9px] text-zinc-500 mt-0.5">{item.subtitle}</span>
                                            </div>
                                        </div>
                                        {/* Play Button */}
                                        <button className="h-6 w-6 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 hover:scale-100">
                                            <Play className="h-2.5 w-2.5 fill-current" />
                                        </button>
                                    </div>

                                    {/* Barra de Progresso */}
                                    <div className="space-y-1 relative z-10">
                                        <div className="flex justify-between text-[8px] text-zinc-400 uppercase font-bold">
                                            <span>Progresso</span>
                                            <span>{item.progress}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} 
                                                className={cn("h-full rounded-full", item.color.replace("text-", "bg-"))} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* VISÃO: BACKLOG / WISHLIST (Lista Compacta) */}
                    {activeTab === "backlog" && (
                        <motion.div 
                            key="backlog"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-2"
                        >
                            {backlog.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        <item.icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-medium text-zinc-200 truncate">{item.title}</span>
                                            <span className="text-[8px] text-zinc-500 truncate">{item.subtitle}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {item.status === "wishlist" ? (
                                        <Heart className="h-3 w-3 text-rose-500 shrink-0" />
                                    ) : (
                                        <ListPlus className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                                    )}
                                </div>
                            ))}
                            
                            {/* Botão Adicionar */}
                            <button className="mt-2 w-full py-1.5 border border-dashed border-zinc-700 rounded text-[9px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-white/5 transition-all">
                                + Adicionar à Fila
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

        </div>
    </BaseCard>
  );
}