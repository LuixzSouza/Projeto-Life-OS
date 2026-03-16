"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { 
    Moon, User, Dumbbell, Footprints, 
    Plus, LayoutDashboard, Timer, Utensils,
    ChevronRight, X, Compass
} from "lucide-react";
import Link from "next/link";
import { GymForm } from "@/components/health/gym/gym-form";
import { RunForm } from "@/components/health/running/run-form";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- CONFIGURAÇÃO DE NAVEGAÇÃO ---
const navItems = [
    { label: "Overview", href: "/health", icon: LayoutDashboard },
    { label: "Treino", href: "/health/gym", icon: Dumbbell },
    { label: "Corrida", href: "/health/running", icon: Footprints },
    { label: "Nutrição", href: "/health/nutrition", icon: Utensils },
    { label: "Sono", href: "/health/sleep", icon: Moon },
    { label: "Corpo", href: "/health/body", icon: User },
];

export function HealthActions() {
    const pathname = usePathname();
    const [gymOpen, setGymOpen] = useState(false);
    const [runOpen, setRunOpen] = useState(false);
    
    // Estado que controla se a pílula de navegação está aberta ou fechada
    const [isNavExpanded, setIsNavExpanded] = useState(false);

    // Encontra qual é a página ativa no momento para mostrar no estado "fechado"
    const activeItem = navItems.find(item => pathname === item.href) || navItems[0];

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
            
            {/* --- NAVEGAÇÃO: PÍLULA DINÂMICA (DYNAMIC PILL) --- */}
            <motion.nav 
                layout
                className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 overflow-hidden shadow-sm"
            >
                <AnimatePresence mode="popLayout">
                    {!isNavExpanded ? (
                        // ESTADO 1: RECOLHIDO (Mostra só a rota atual)
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 gap-2 font-medium bg-background text-foreground shadow-sm hover:bg-background/90"
                                onClick={() => setIsNavExpanded(true)}
                            >
                                <activeItem.icon className="h-4 w-4 text-primary" />
                                <span className="text-xs">{activeItem.label}</span>
                                <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground" />
                            </Button>
                        </motion.div>
                    ) : (
                        // ESTADO 2: EXPANDIDO (Mostra todos os links)
                        <motion.div
                            key="expanded"
                            className="flex items-center gap-1"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-1">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <Button 
                                                variant={isActive ? "default" : "ghost"} 
                                                size="sm" 
                                                className={cn(
                                                    "h-8 px-3 gap-2 transition-all shadow-none",
                                                    isActive ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                                )}
                                                onClick={() => setIsNavExpanded(false)} // Fecha ao clicar num link
                                            >
                                                <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                                                <span className="hidden lg:inline text-xs font-medium">{item.label}</span>
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Divisória e Botão Fechar */}
                            <div className="w-px h-4 bg-border/60 mx-1" />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-rose-500/10 transition-colors" 
                                onClick={() => setIsNavExpanded(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>

            {/* --- BOTÕES DE AÇÃO RÁPIDA --- */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                
                {/* REGISTRAR TREINO */}
                <Dialog open={gymOpen} onOpenChange={setGymOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-9 gap-2 font-medium w-full sm:w-auto shadow-sm">
                            <Plus className="h-4 w-4" />
                            Registrar Treino
                        </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/40 shadow-2xl rounded-2xl">
                        <DialogHeader className="px-6 pt-6 pb-2">
                            <DialogTitle className="text-xl">Novo Treino</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da sua sessão de musculação.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="px-6 pb-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                            <GymForm onSuccess={() => setGymOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* REGISTRAR CORRIDA */}
                <Dialog open={runOpen} onOpenChange={setRunOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="h-9 gap-2 font-medium w-full sm:w-auto shadow-sm border border-border/40 bg-card hover:bg-muted/80">
                            <Timer className="h-4 w-4 text-blue-500" />
                            Nova Corrida
                        </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-border/40 shadow-2xl rounded-2xl">
                        <DialogHeader className="px-6 pt-6 pb-2">
                            <DialogTitle className="text-xl">Registrar Corrida</DialogTitle>
                            <DialogDescription>
                                Adicione as métricas de tempo e distância do seu cardio.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="px-6 pb-6">
                            <RunForm onSuccess={() => setRunOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}