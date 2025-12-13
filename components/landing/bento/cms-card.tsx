"use client";

import { Globe, LayoutTemplate, RefreshCw, Server, CheckCircle2, GitCommit, ArrowUpRight, LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Tipagem dos Projetos
interface CMSProject {
  id: string;
  name: string;
  url: string;
  status: "live" | "building" | "maintenance";
  framework: string;
  lastSync: string;
  apiStatus: "healthy" | "degraded";
  visits: string;
}

const PROJECTS: CMSProject[] = [
  {
    id: "ana-clara",
    name: "Ana Clara Estética",
    url: "anaclara.com.br",
    status: "live",
    framework: "Next.js 14",
    lastSync: "2 min atrás",
    apiStatus: "healthy",
    visits: "1.2k/mês"
  },
  {
    id: "univac",
    name: "UniVac System",
    url: "univac.app",
    status: "live",
    framework: "React + Node",
    lastSync: "1h atrás",
    apiStatus: "healthy",
    visits: "850/mês"
  },
  {
    id: "portfolio",
    name: "Luiz Dev V2",
    url: "luiz.dev",
    status: "building",
    framework: "Astro",
    lastSync: "Pendente",
    apiStatus: "healthy",
    visits: "-"
  }
];

export function CMSCard() {
  const [activeId, setActiveId] = useState<string>("ana-clara");
  const [isSyncing, setIsSyncing] = useState(false);

  const activeProject = PROJECTS.find(p => p.id === activeId) || PROJECTS[0];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000); // Simula delay da API
  };

  return (
    <BaseCard 
        title="Gerenciador CMS" 
        icon={LayoutTemplate} 
        description="Controle multi-projetos via API."
        className="col-span-1 min-h-[260px]"
    >
        <div className="flex h-full w-full bg-[#09090b] text-xs">
            
            {/* --- SIDEBAR: LISTA DE PROJETOS --- */}
            <div className="w-1/3 border-r border-white/5 bg-zinc-900/30 flex flex-col p-2 gap-1">
                {PROJECTS.map((project) => (
                    <button
                        key={project.id}
                        onClick={() => setActiveId(project.id)}
                        className={cn(
                            "text-left p-2 rounded-lg transition-all relative group",
                            activeId === project.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                        )}
                    >
                        {/* Status Dot */}
                        <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                project.status === "live" ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <span className="font-bold truncate">{project.name}</span>
                        </div>
                        <span className="text-[9px] opacity-60 truncate block">{project.url}</span>
                        
                        {/* Indicador de Seleção */}
                        {activeId === project.id && (
                            <motion.div 
                                layoutId="active-project"
                                className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-r-full"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* --- MAIN: DETALHES DO PROJETO --- */}
            <div className="flex-1 p-4 flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeProject.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col h-full justify-between"
                    >
                        {/* Header do Projeto */}
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        {activeProject.name}
                                        <ArrowUpRight className="h-3 w-3 text-zinc-600" />
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 font-mono">{activeProject.framework}</span>
                                </div>
                                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase">
                                    {activeProject.status}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-zinc-800/50 p-2 rounded border border-white/5">
                                    <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                                        <Globe className="h-3 w-3" />
                                        <span className="text-[9px]">Visitas</span>
                                    </div>
                                    <span className="text-white font-mono">{activeProject.visits}</span>
                                </div>
                                <div className="bg-zinc-800/50 p-2 rounded border border-white/5">
                                    <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                                        <Server className="h-3 w-3" />
                                        <span className="text-[9px]">API Health</span>
                                    </div>
                                    <span className="text-emerald-400 font-mono flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> 100%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions / API Console */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] text-zinc-500">
                                <span>Última Sincronização: {activeProject.lastSync}</span>
                                <GitCommit className="h-3 w-3" />
                            </div>
                            
                            <button 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full h-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isSyncing ? (
                                    <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span className="font-bold">Deploying...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500" />
                                        <span className="font-bold">Revalidar Cache (API)</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>

        </div>
    </BaseCard>
  );
}