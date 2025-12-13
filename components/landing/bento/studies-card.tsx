"use client";

import { 
  BookOpen, 
  RotateCw, 
  Check, 
  X, 
  Clock, 
  Trophy, 
  BrainCircuit, 
  Play, 
  Pause, 
  Zap,
  Target,
  LucideIcon
} from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA (Correção do ANY) ---
type StudyTab = "pomodoro" | "cards" | "game";

interface TabItem {
    id: StudyTab;
    icon: LucideIcon;
    label: string;
}

// --- SUB-COMPONENTES PARA CADA MODO ---

// 1. MODO POMODORO (Ajustado para caber)
function PomodoroView() {
  const [isActive, setIsActive] = useState(false);
  
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
        {/* Timer Visual (Levemente menor) */}
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-500" strokeDasharray="226" strokeDashoffset="60" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white tracking-widest font-mono">24:59</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Foco</span>
            </div>
        </div>

        {/* Controles */}
        <button 
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-bold transition-all active:scale-95"
        >
            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isActive ? "PAUSAR" : "INICIAR"}
        </button>
    </div>
  );
}

// 2. MODO FLASHCARDS (Altura ajustada)
function FlashcardView() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-1000 group/study">
        <motion.div 
            className="w-full h-20 relative cursor-pointer" // Altura reduzida para 20
            onClick={() => setFlipped(!flipped)}
            whileTap={{ scale: 0.98 }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            style={{ transformStyle: "preserve-3d" }}
        >
            {/* FRENTE */}
            <div className="absolute inset-0 bg-zinc-800 border border-zinc-700 rounded-xl flex flex-col items-center justify-center p-2 shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 absolute top-2 right-2 font-bold">Hard</span>
                <p className="text-[9px] text-zinc-500 mb-0.5 uppercase tracking-widest">React Hook</p>
                <p className="text-xs font-bold text-zinc-200 text-center">Função do <span className="text-indigo-400 font-mono">useMemo</span>?</p>
            </div>

            {/* VERSO */}
            <div className="absolute inset-0 bg-zinc-900 border border-indigo-500/30 rounded-xl flex flex-col items-center justify-between p-2 shadow-lg" style={{ transform: "rotateY(180deg)", backfaceVisibility: 'hidden' }}>
                <div className="flex-1 flex items-center justify-center text-center px-1">
                    <p className="text-[10px] text-zinc-300 leading-tight">Memoizar valores computados caros.</p>
                </div>
                {/* Botões SM-2 */}
                <div className="flex gap-1.5 w-full">
                    <div className="h-5 flex-1 rounded bg-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"><X className="h-3 w-3" /></div>
                    <div className="h-5 flex-1 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"><Check className="h-3 w-3" /></div>
                </div>
            </div>
        </motion.div>
    </div>
  );
}

// 3. MODO QUIZ
function GamificationView() {
  return (
    <div className="flex flex-col h-full justify-center gap-2 px-1">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center">
                <Target className="h-4 w-4 text-emerald-500 mb-1" />
                <span className="text-base font-bold text-white">85%</span>
                <span className="text-[8px] text-zinc-500 uppercase">Precisão</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center">
                <Zap className="h-4 w-4 text-amber-500 mb-1" />
                <span className="text-base font-bold text-white">12</span>
                <span className="text-[8px] text-zinc-500 uppercase">Streak</span>
            </div>
        </div>

        {/* Daily Goal */}
        <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-zinc-400">
                <span>XP Diário</span>
                <span>850/1k</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: "85%" }} 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" 
                />
            </div>
        </div>
    </div>
  );
}

export function StudiesCard() {
  const [activeTab, setActiveTab] = useState<StudyTab>("pomodoro");

  const tabs: TabItem[] = [
    { id: "pomodoro", icon: Clock, label: "Foco" },
    { id: "cards", icon: BookOpen, label: "Cards" },
    { id: "game", icon: Trophy, label: "Rank" },
  ];

  return (
    <BaseCard 
        title="Study Lab" 
        icon={BrainCircuit} 
        description="Hub de estudos integrado."
        className="col-span-1 h-full min-h-[260px]:"
    >
        <div className="flex flex-col h-full w-full bg-[#09090b]">
            
            {/* --- HEADER GAMIFICADO --- */}
            <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold">Nível 12</span>
                        <div className="w-10 h-1 bg-zinc-800 rounded-full mt-0.5">
                            <div className="w-[60%] h-full bg-yellow-500 rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-400">
                    <span className="text-white font-bold">1.2k</span> XP
                </div>
            </div>

            {/* --- CONTEÚDO PRINCIPAL (Flex-1 para ocupar espaço) --- */}
            <div className="flex-1 p-3 relative overflow-hidden flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="h-full w-full"
                    >
                        {activeTab === "pomodoro" && <PomodoroView />}
                        {activeTab === "cards" && <FlashcardView />}
                        {activeTab === "game" && <GamificationView />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* --- MENU INFERIOR --- */}
            <div className="p-2 border-t border-white/5 bg-zinc-900/30 shrink-0">
                <div className="flex justify-between items-center bg-zinc-800/50 rounded-lg p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all",
                                    isActive 
                                        ? "bg-zinc-700 text-white shadow-sm" 
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                )}
                            >
                                <Icon className="h-3 w-3" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

        </div>
    </BaseCard>
  );
}