"use client";

import { Link as LinkIcon, Search, Plus, ArrowUpRight, Github, Figma, Layout, BookMarked, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion } from "framer-motion";
import { useState } from "react";

// model SavedLink: title, url, category, isFavorite.
interface LinkItem {
  id: string;
  label: string;
  url: string;
  category: string;
  icon: LucideIcon;
  favorite?: boolean;
}

const SAVED_LINKS: LinkItem[] = [
  { id: "1", label: "Tailwind CSS", url: "tailwindcss.com", category: "Dev", icon: Layout, favorite: true },
  { id: "2", label: "Lucide Icons", url: "lucide.dev", category: "Dev", icon: LinkIcon },
  { id: "3", label: "Figma Community", url: "figma.com", category: "Design", icon: Figma },
  { id: "4", label: "Next.js Docs", url: "nextjs.org", category: "Dev", icon: Github, favorite: true },
  { id: "5", label: "Godly Website", url: "godly.website", category: "Ref", icon: BookMarked },
];

export function LinksCard() {
  const [search, setSearch] = useState("");
  const filtered = SAVED_LINKS.filter(
    (l) => l.label.toLowerCase().includes(search.toLowerCase()) || l.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BaseCard title="Links & Apps" icon={LinkIcon} description="Repositório de referências." className="col-span-1 min-h-[260px]">
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        {/* Busca */}
        <div className="z-20 border-b border-border/60 p-3 pb-2">
          <div className="relative flex items-center rounded-lg border border-border/60 bg-muted transition-colors focus-within:border-primary/40">
            <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar recurso…"
              className="w-full border-none bg-transparent py-2 pl-8 pr-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((link) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.id}
                  href={`https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center justify-between rounded-lg border border-transparent p-2 transition-all hover:border-primary/20 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-7 place-items-center rounded-md border border-border/60 bg-card text-primary transition-colors group-hover:bg-primary/10">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                        {link.label}
                        {link.favorite && <Star className="size-2.5 fill-primary text-primary" />}
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">{link.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary">
                      {link.category}
                    </span>
                    <ArrowUpRight className="size-3 -translate-x-2 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </motion.a>
              );
            })
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground opacity-50">
              <Search className="size-5" />
              <span className="text-[10px]">Nenhum link encontrado</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-background/50 p-2">
          <button className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-2 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
            <Plus className="size-3 group-hover:text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Salvar novo link</span>
          </button>
        </div>
      </div>
    </BaseCard>
  );
}
