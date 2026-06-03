"use client";

import { BookOpen, Check, X, Clock, Trophy, BrainCircuit, Play, Pause, Target, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

type StudyTab = "pomodoro" | "cards" | "game";

interface TabItem {
  id: StudyTab;
  icon: LucideIcon;
  label: string;
}

// model StudySession: focus/pomodoro.
function PomodoroView() {
  const [isActive, setIsActive] = useState(false);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="relative flex size-20 items-center justify-center">
        <svg className="size-full -rotate-90">
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted" />
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-primary" strokeDasharray="226" strokeDashoffset="60" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold tracking-widest text-foreground">24:59</span>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground">Foco</span>
        </div>
      </div>
      <button
        onClick={() => setIsActive(!isActive)}
        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold text-primary-foreground transition-all active:scale-95"
      >
        {isActive ? <Pause className="size-3" /> : <Play className="size-3" />}
        {isActive ? "PAUSAR" : "INICIAR"}
      </button>
    </div>
  );
}

// model Flashcard: box (Leitner), term, definition.
function FlashcardView() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="perspective-1000 flex size-full items-center justify-center">
      <motion.div
        className="relative h-20 w-full cursor-pointer"
        onClick={() => setFlipped(!flipped)}
        whileTap={{ scale: 0.98 }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Frente */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-muted p-2 shadow-lg" style={{ backfaceVisibility: "hidden" }}>
          <span className="absolute right-2 top-2 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">Caixa 3</span>
          <p className="mb-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">React Hook</p>
          <p className="text-center text-xs font-bold text-foreground">
            Função do <span className="font-mono text-primary">useMemo</span>?
          </p>
        </div>
        {/* Verso */}
        <div className="absolute inset-0 flex flex-col items-center justify-between rounded-xl border border-primary/30 bg-card p-2 shadow-lg" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
          <div className="flex flex-1 items-center justify-center px-1 text-center">
            <p className="text-[10px] leading-tight text-foreground">Memoizar valores computados caros.</p>
          </div>
          <div className="flex w-full gap-1.5">
            <div className="flex h-5 flex-1 items-center justify-center rounded border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted">
              <X className="size-3" />
            </div>
            <div className="flex h-5 flex-1 items-center justify-center rounded bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
              <Check className="size-3" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// models LearningGoal / UserStats (streak, metas).
function GoalsView() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center rounded-lg border border-border/60 bg-muted/50 p-2">
          <Target className="mb-1 size-4 text-primary" />
          <span className="text-base font-bold text-foreground">85%</span>
          <span className="text-[8px] uppercase text-muted-foreground">Precisão</span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-border/60 bg-muted/50 p-2">
          <Zap className="mb-1 size-4 text-primary" />
          <span className="text-base font-bold text-foreground">12</span>
          <span className="text-[8px] uppercase text-muted-foreground">Streak</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Meta diária</span>
          <span>51 / 60 min</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div initial={{ width: 0 }} whileInView={{ width: "85%" }} className="h-full bg-gradient-brand" />
        </div>
      </div>
    </div>
  );
}

export function StudiesCard() {
  const [active, setActive] = useState<StudyTab>("pomodoro");
  const tabs: TabItem[] = [
    { id: "pomodoro", icon: Clock, label: "Foco" },
    { id: "cards", icon: BookOpen, label: "Cards" },
    { id: "game", icon: Trophy, label: "Metas" },
  ];

  return (
    <BaseCard title="Estudos" icon={BrainCircuit} description="Sessões, flashcards e metas." className="col-span-1 h-full min-h-[260px]">
      <div className="flex h-full w-full flex-col">
        {/* Header com nível/streak (UserStats) */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="grid size-5 place-items-center rounded-md border border-primary/30 bg-primary/10">
              <Trophy className="size-3 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">Nível 12</span>
              <div className="mt-0.5 h-1 w-10 rounded-full bg-muted">
                <div className="h-full w-[60%] rounded-full bg-gradient-brand" />
              </div>
            </div>
          </div>
          <div className="font-mono text-[9px] text-muted-foreground">
            <span className="font-bold text-foreground">1.2k</span> XP
          </div>
        </div>

        {/* Conteúdo */}
        <div className="relative flex flex-1 flex-col justify-center overflow-hidden p-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="size-full"
            >
              {active === "pomodoro" && <PomodoroView />}
              {active === "cards" && <FlashcardView />}
              {active === "game" && <GoalsView />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Menu */}
        <div className="shrink-0 border-t border-border/60 p-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[9px] font-bold uppercase tracking-wide transition-all",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TabIcon className="size-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
