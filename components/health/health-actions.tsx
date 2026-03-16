"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { 
    CalendarDays, Moon, User, Dumbbell, Footprints, 
    Plus, LayoutDashboard, ChevronRight, Activity,
    ClipboardSignature, Timer
} from "lucide-react";
import Link from "next/link";
import { GymForm } from "@/components/health/gym/gym-form";
import { RunForm } from "@/components/health/running/run-form";
import { cn } from "@/lib/utils";

// --- CONFIGURAÇÃO DE NAVEGAÇÃO ---
const navItems = [
    { label: "Dashboard", href: "/health", icon: LayoutDashboard, color: "text-primary" },
    { label: "Treino", href: "/health/gym", icon: Dumbbell, color: "text-rose-500" },
    { label: "Corrida", href: "/health/running", icon: Footprints, color: "text-blue-500" },
    { label: "Nutrição", href: "/health/nutrition", icon: CalendarDays, color: "text-emerald-500" },
    { label: "Sono", href: "/health/sleep", icon: Moon, color: "text-indigo-500" },
    { label: "Corpo", href: "/health/body", icon: User, color: "text-amber-500" },
];

export function HealthActions() {
    const [gymOpen, setGymOpen] = useState(false);
    const [runOpen, setRunOpen] = useState(false);

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
            
            {/* --- DOCK DE NAVEGAÇÃO (SEGMENTED CONTROL STYLE) --- */}
            <nav className="flex items-center gap-1 bg-muted/40 p-1.5 rounded-[1.25rem] border border-border/40 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-all shadow-none group"
                        >
                            <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", item.color)} />
                            <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </Button>
                    </Link>
                ))}
            </nav>

            {/* --- SEÇÃO DE AÇÕES RÁPIDAS --- */}
            <div className="flex items-center gap-2 shrink-0">
                
                {/* REGISTRAR TREINO */}
                <Dialog open={gymOpen} onOpenChange={setGymOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 rounded-2xl px-5 font-black uppercase tracking-widest text-[10px] gap-2 transition-all active:scale-95">
                            <Plus className="h-4 w-4 stroke-[3]" />
                            Log Treino
                        </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[600px] max-h-[90vh] overflow-hidden p-0 gap-0 bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100]">
                        <div className="p-8 border-b border-border/40 bg-muted/10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                    <ClipboardSignature className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Ficha de Performance</DialogTitle>
                                    <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Sessão de treinamento de força</DialogDescription>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar max-h-[calc(90vh-120px)]">
                            <GymForm onSuccess={() => setGymOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* REGISTRAR CORRIDA */}
                <Dialog open={runOpen} onOpenChange={setRunOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-border/60 bg-background/50 hover:bg-muted text-foreground shadow-sm h-10 rounded-2xl px-5 font-black uppercase tracking-widest text-[10px] gap-2 transition-all active:scale-95">
                            <Timer className="h-4 w-4 text-blue-500 stroke-[2.5]" />
                            Nova Corrida
                        </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[480px] p-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-[2.5rem] z-[100]">
                        <div className="p-8 border-b border-border/40 bg-blue-500/[0.03]">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                                    <Activity className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Métrica de Endurance</DialogTitle>
                                    <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Registro de cardio e percurso</DialogDescription>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            <RunForm onSuccess={() => setRunOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}