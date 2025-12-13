"use client";

import { 
  Link as LinkIcon, 
  Search, 
  Plus, 
  ArrowUpRight, 
  Github, 
  Figma, 
  Layout, 
  BookMarked,
  LucideIcon
} from "lucide-react";
import { BaseCard } from "./base-card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

// --- TIPAGEM ---
interface LinkItem {
  id: string;
  label: string;
  url: string;
  category: "Dev" | "Design" | "Ref";
  icon: LucideIcon;
  color: string;
}

// --- DADOS (SEUS LINKS SALVOS) ---
const SAVED_LINKS: LinkItem[] = [
  { id: "1", label: "Tailwind Colors", url: "tailwindcss.com", category: "Dev", icon: Layout, color: "text-cyan-400" },
  { id: "2", label: "Lucide Icons", url: "lucide.dev", category: "Dev", icon:  LinkIcon, color: "text-orange-400" },
  { id: "3", label: "Figma Community", url: "figma.com", category: "Design", icon: Figma, color: "text-rose-400" },
  { id: "4", label: "Next.js Docs", url: "nextjs.org", category: "Dev", icon: Github, color: "text-white" },
  { id: "5", label: "Godly Website", url: "godly.website", category: "Ref", icon: BookMarked, color: "text-purple-400" },
];

export function LinksCard() {
  const [search, setSearch] = useState("");

  // Filtra os links baseado na busca
  const filteredLinks = SAVED_LINKS.filter(link => 
    link.label.toLowerCase().includes(search.toLowerCase()) || 
    link.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BaseCard 
        title="Links & Recursos" 
        icon={LinkIcon} 
        description="Repositório de referências."
        className="col-span-1 min-h-[260px]"
    >
        <div className="flex flex-col h-full w-full bg-[#09090b] relative overflow-hidden">
            
            {/* --- HEADER: BARRA DE BUSCA --- */}
            <div className="p-3 pb-2 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md z-20">
                <div className="relative flex items-center bg-zinc-800 rounded-lg border border-white/5 focus-within:border-zinc-600 transition-colors">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar recurso..." 
                        className="w-full bg-transparent border-none outline-none text-[11px] text-zinc-200 py-2 pl-8 pr-2 placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* --- LISTA DE LINKS (SCROLLABLE) --- */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredLinks.length > 0 ? (
                    filteredLinks.map((link) => (
                        <motion.a
                            key={link.id}
                            href={`https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 group transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md bg-zinc-900 border border-white/5 group-hover:bg-zinc-800 transition-colors">
                                    <link.icon className={cn("h-3.5 w-3.5", link.color)} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white transition-colors">
                                        {link.label}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                        {link.url}
                                    </span>
                                </div>
                            </div>

                            {/* Categoria Badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-zinc-600 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider">
                                    {link.category}
                                </span>
                                <ArrowUpRight className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </div>
                        </motion.a>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 opacity-50">
                        <Search className="h-5 w-5" />
                        <span className="text-[10px]">Nenhum link encontrado</span>
                    </div>
                )}
            </div>

            {/* --- FOOTER: ADICIONAR NOVO --- */}
            <div className="p-2 border-t border-white/5 bg-gradient-to-t from-black via-zinc-900/80 to-transparent z-10">
                <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-700 hover:bg-zinc-800/50 hover:border-zinc-500 hover:text-zinc-200 text-zinc-500 transition-all group">
                    <div className="bg-zinc-800 p-0.5 rounded group-hover:bg-zinc-700 transition-colors">
                        <Plus className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Salvar Novo Link
                    </span>
                </button>
            </div>

        </div>
    </BaseCard>
  );
}