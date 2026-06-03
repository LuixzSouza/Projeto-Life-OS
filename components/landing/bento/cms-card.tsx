"use client";

import { Globe, LayoutTemplate, RefreshCw, FileText, CheckCircle2, ArrowUpRight, KeyRound } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// models ManagedSite (name, url, apiKey) + SitePage.
interface Site {
  id: string;
  name: string;
  url: string;
  live: boolean;
  pages: number;
  visits: string;
}

const SITES: Site[] = [
  { id: "ana-clara", name: "Ana Clara Estética", url: "anaclara.com.br", live: true, pages: 8, visits: "1.2k/mês" },
  { id: "univac", name: "UniVac System", url: "univac.app", live: true, pages: 14, visits: "850/mês" },
  { id: "portfolio", name: "Luiz Dev V2", url: "luiz.dev", live: false, pages: 5, visits: "—" },
];

export function CMSCard() {
  const [activeId, setActiveId] = useState("ana-clara");
  const [isSyncing, setIsSyncing] = useState(false);
  const site = SITES.find((p) => p.id === activeId) ?? SITES[0];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1600);
  };

  return (
    <BaseCard title="Sites & CMS" icon={LayoutTemplate} description="Controle multi-site via API." className="col-span-1 min-h-[260px]">
      <div className="flex h-full w-full text-xs">
        {/* Lista de sites */}
        <div className="flex w-1/3 flex-col gap-1 border-r border-border/60 p-2">
          {SITES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn(
                "relative rounded-lg p-2 text-left transition-all",
                activeId === s.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <div className={cn("size-1.5 rounded-full", s.live ? "bg-primary" : "bg-muted-foreground/40")} />
                <span className="truncate font-bold">{s.name}</span>
              </div>
              <span className="block truncate text-[9px] opacity-60">{s.url}</span>
              {activeId === s.id && <motion.div layoutId="active-site" className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full bg-primary" />}
            </button>
          ))}
        </div>

        {/* Detalhe */}
        <div className="flex flex-1 flex-col p-4">
          <AnimatePresence mode="wait">
            <motion.div key={site.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      {site.name}
                      <ArrowUpRight className="size-3 text-muted-foreground" />
                    </h4>
                    <span className="font-mono text-[10px] text-muted-foreground">{site.url}</span>
                  </div>
                  <span className={cn("rounded border px-2 py-1 text-[9px] font-bold uppercase", site.live ? "border-primary/20 bg-primary/10 text-primary" : "border-border/60 bg-muted/60 text-muted-foreground")}>
                    {site.live ? "Live" : "Draft"}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded border border-border/60 bg-muted/50 p-2">
                    <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="size-3" />
                      <span className="text-[9px]">Páginas</span>
                    </div>
                    <span className="font-mono text-foreground">{site.pages}</span>
                  </div>
                  <div className="rounded border border-border/60 bg-muted/50 p-2">
                    <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="size-3" />
                      <span className="text-[9px]">Visitas</span>
                    </div>
                    <span className="font-mono text-foreground">{site.visits}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <KeyRound className="size-3" /> API Key ativa
                  </span>
                  <CheckCircle2 className="size-3 text-primary" />
                </div>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="group flex h-8 w-full items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3", isSyncing ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180")} />
                  <span className="font-bold">{isSyncing ? "Revalidando…" : "Revalidar cache (API)"}</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BaseCard>
  );
}
