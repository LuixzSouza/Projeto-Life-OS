"use client";

import { Film, Gamepad2, Tv, Play, BookText, Heart, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// model MediaItem: title, type, status (PLAN_TO_WATCH/WATCHING), rating.
interface Media {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  progress?: number;
  rating?: number;
  status: "watching" | "backlog" | "wishlist";
}

const MEDIA: Media[] = [
  { id: "1", title: "Dune: Parte Dois", subtitle: "Filme · 1h45 restante", icon: Film, progress: 65, status: "watching" },
  { id: "2", title: "Elden Ring", subtitle: "Jogo · Leyndell", icon: Gamepad2, progress: 42, status: "watching" },
  { id: "3", title: "The Bear T3", subtitle: "Série · 8 eps", icon: Tv, rating: 5, status: "backlog" },
  { id: "4", title: "Projeto Hail Mary", subtitle: "Livro · A. Weir", icon: BookText, rating: 4, status: "backlog" },
  { id: "5", title: "GTA VI", subtitle: "Jogo · 2026", icon: Gamepad2, status: "wishlist" },
];

export function EntertainmentCard() {
  const [tab, setTab] = useState<"watching" | "backlog">("watching");
  const watching = MEDIA.filter((i) => i.status === "watching");
  const backlog = MEDIA.filter((i) => i.status !== "watching");

  return (
    <BaseCard title="Entretenimento" icon={Play} description="Filmes, séries, jogos e livros." className="col-span-1 h-full">
      <div className="relative flex h-full w-full flex-col">
        {/* Abas */}
        <div className="flex border-b border-border/60">
          {(["watching", "backlog"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 border-b-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "watching" ? "Em andamento" : "Fila / Desejos"}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          <AnimatePresence mode="wait">
            {tab === "watching" ? (
              <motion.div key="watching" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex flex-col gap-3">
                {watching.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="group rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/30">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="grid size-7 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none text-foreground">{item.title}</span>
                            <span className="mt-0.5 text-[9px] text-muted-foreground">{item.subtitle}</span>
                          </div>
                        </div>
                        <button className="grid size-6 scale-90 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all hover:scale-100 group-hover:opacity-100">
                          <Play className="size-2.5 fill-current" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold uppercase text-muted-foreground">
                          <span>Progresso</span>
                          <span>{item.progress}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} className="h-full rounded-full bg-gradient-brand" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="backlog" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-2">
                {backlog.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Icon className="size-3.5 shrink-0 text-primary" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[11px] font-medium text-foreground">{item.title}</span>
                          <span className="truncate text-[8px] text-muted-foreground">{item.subtitle}</span>
                        </div>
                      </div>
                      {item.status === "wishlist" ? (
                        <Heart className="size-3 shrink-0 text-primary" />
                      ) : (
                        <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-bold text-primary">
                          <Star className="size-3 fill-current" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                  );
                })}
                <button className="mt-2 w-full rounded border border-dashed border-border/60 py-1.5 text-[9px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
                  + Adicionar à fila
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BaseCard>
  );
}
