"use client";

import { 
  Briefcase, 
  CheckCircle2, 
  Circle, 
  MoreHorizontal, 
  Building2, 
  MapPin, 
  CalendarClock,
  ArrowUpRight 
} from "lucide-react";
import { BaseCard } from "./base-card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- TIPOS ---
type Tab = "projects" | "jobs";

interface JobApplication {
  id: string;
  role: string;
  company: string;
  status: "applied" | "interview" | "offer" | "rejected";
  date: string;
  logo: string; // Inicial
}

// --- DADOS MOCKADOS ---
const JOBS: JobApplication[] = [
  { id: "1", role: "Frontend Engineer", company: "Vercel", status: "interview", date: "Hoje, 14:00", logo: "V" },
  { id: "2", role: "Fullstack Dev", company: "Nubank", status: "applied", date: "Há 2 dias", logo: "N" },
  { id: "3", role: "React Developer", company: "Shopify", status: "rejected", date: "Ontem", logo: "S" },
];

export function ProjectsCard() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  
  // Estado das Tarefas (Projetos)
  const [tasks, setTasks] = useState([
    { id: 1, text: "Design System", done: true, tag: "UI", color: "bg-pink-500" },
    { id: 2, text: "API Routes", done: false, tag: "Dev", color: "bg-blue-500" },
    { id: 3, text: "Deploy Vercel", done: false, tag: "Infra", color: "bg-emerald-500" },
  ]);

  const toggleTask = (id: number) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));

  // Progresso
  const completedCount = tasks.filter(t => t.done).length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  // Helper para Status de Vaga
  const getStatusStyle = (status: JobApplication["status"]) => {
    switch(status) {
      case "interview": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "offer": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "rejected": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const getStatusLabel = (status: JobApplication["status"]) => {
    switch(status) {
      case "interview": return "Entrevista";
      case "offer": return "Proposta";
      case "rejected": return "Recusado";
      default: return "Aplicado";
    }
  };

  return (
    <BaseCard 
        title="Trabalho & Carreira" 
        icon={Briefcase} 
        description="Gestão de projetos e vagas." 
        className="col-span-2 md:col-span-1 lg:row-span-2"
    >
        <div className="flex flex-col h-full w-full bg-card">
            
            {/* --- SELETOR DE ABA (Switch) --- */}
            <div className="px-4 pt-3 pb-2 border-b border-border bg-card/50">
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab("projects")}
                        className={cn(
                            "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                            activeTab === "projects" ? "bg-zinc-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Sprints
                    </button>
                    <button 
                        onClick={() => setActiveTab("jobs")}
                        className={cn(
                            "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                            activeTab === "jobs" ? "bg-zinc-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Vagas
                    </button>
                </div>
            </div>

            {/* --- CONTEÚDO DINÂMICO --- */}
            <div className="flex-1 p-3 overflow-y-auto min-h-0 relative">
                <AnimatePresence mode="wait">
                    
                    {/* 1. VISÃO PROJETOS (Checklist) */}
                    {activeTab === "projects" && (
                        <motion.div 
                            key="projects"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col gap-3 h-full"
                        >
                            {/* Barra de Progresso */}
                            <div className="space-y-1 mb-2">
                                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                    <span>Sprint Atual: Life OS</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                                        className={cn("h-full rounded-full transition-colors", progress === 100 ? "bg-emerald-500" : "bg-indigo-500")} 
                                    />
                                </div>
                            </div>

                            {/* Lista de Tarefas */}
                            <div className="flex flex-col gap-2">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-95 group",
                                            task.done ? "bg-indigo-500/5 border-indigo-500/20" : "bg-muted/40 border-border hover:bg-muted"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                task.done ? "bg-indigo-500 border-indigo-500" : "border-border group-hover:border-border"
                                            )}>
                                                {task.done && <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />}
                                            </div>
                                            <span className={cn("text-xs font-medium transition-colors", task.done ? "text-muted-foreground line-through" : "text-foreground")}>
                                                {task.text}
                                            </span>
                                        </div>
                                        <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border border-border", task.done ? "opacity-50" : "bg-card text-muted-foreground")}>
                                            {task.tag}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* 2. VISÃO VAGAS (Job Tracker) */}
                    {activeTab === "jobs" && (
                        <motion.div 
                            key="jobs"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-2 h-full"
                        >
                            {JOBS.map((job) => (
                                <div key={job.id} className="p-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/60 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">
                                                {job.logo}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                                                    {job.role}
                                                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                                </h4>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" /> {job.company}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase border", getStatusStyle(job.status))}>
                                            {getStatusLabel(job.status)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground pl-11">
                                        <CalendarClock className="h-3 w-3" />
                                        <span>Atualizado: {job.date}</span>
                                    </div>
                                </div>
                            ))}

                            <button className="mt-auto w-full py-2 border border-dashed border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:border-border transition-all">
                                + Registrar Aplicação
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

        </div>
    </BaseCard>
  );
}