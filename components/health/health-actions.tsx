"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Moon, User, Dumbbell, Footprints, Plus } from "lucide-react";
import Link from "next/link";
import { GymForm } from "@/components/health/gym/gym-form";
import { RunForm } from "@/components/health/running/run-form";
import { cn } from "@/lib/utils";

export function HealthActions() {
    const [gymOpen, setGymOpen] = useState(false);
    const [runOpen, setRunOpen] = useState(false);

    return (
        <div className="flex flex-wrap gap-3 items-center">
            
            {/* Navegação Rápida (Abas Secundárias) */}
            <div className="flex items-center gap-2 mr-2 bg-muted/30 p-1 rounded-lg border border-border/50 overflow-x-auto no-scrollbar max-w-full">
                <Link href="/health/gym">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-background shadow-none transition-all">
                        <Dumbbell className="h-4 w-4 text-primary" /> 
                        <span className="hidden sm:inline font-medium">Treino</span>
                    </Button>
                </Link>
                <div className="w-px h-4 bg-border/60" />
                <Link href="/health/running">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-background shadow-none transition-all">
                        <Footprints className="h-4 w-4 text-blue-500" /> 
                        <span className="hidden sm:inline font-medium">Corrida</span>
                    </Button>
                </Link>
                <div className="w-px h-4 bg-border/60" />
                <Link href="/health/nutrition">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-background shadow-none transition-all">
                        <CalendarDays className="h-4 w-4 text-emerald-500" /> 
                        <span className="hidden sm:inline font-medium">Nutrição</span>
                    </Button>
                </Link>
                <div className="w-px h-4 bg-border/60" />
                <Link href="/health/sleep">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-background shadow-none transition-all">
                        <Moon className="h-4 w-4 text-indigo-500" /> 
                        <span className="hidden sm:inline font-medium">Sono</span>
                    </Button>
                </Link>
                <div className="w-px h-4 bg-border/60" />
                <Link href="/health/body">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-background shadow-none transition-all">
                        <User className="h-4 w-4 text-rose-500" /> 
                        <span className="hidden sm:inline font-medium">Corpo</span>
                    </Button>
                </Link>
            </div>

            {/* Separador Visual (Desktop) */}
            <div className="hidden md:block h-8 w-px bg-border/60 mx-1" />

            {/* Ações Principais (Modais) */}
            <div className="flex gap-2">
                {/* Modal de Treino de Força */}
                <Dialog open={gymOpen} onOpenChange={setGymOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-9 px-4 transition-all active:scale-95 font-semibold">
                            <Plus className="h-4 w-4 mr-1.5" /> Registrar Treino
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-0 gap-0 bg-background border-border shadow-2xl rounded-xl">
                        <div className="p-6 border-b border-border/40 bg-muted/10">
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Dumbbell className="h-5 w-5" /> 
                                </div>
                                Ficha de Treino
                            </DialogTitle>
                        </div>
                        <div className="p-6">
                            <GymForm onSuccess={() => setGymOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Corrida */}
                <Dialog open={runOpen} onOpenChange={setRunOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary transition-all">
                            <Footprints className="h-4 w-4" /> 
                            <span className="hidden sm:inline">Nova Corrida</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl">
                        <div className="p-6 border-b border-border/40 bg-muted/10">
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Footprints className="h-5 w-5" /> 
                                </div>
                                Registrar Corrida
                            </DialogTitle>
                        </div>
                        <div className="p-6">
                            <RunForm onSuccess={() => setRunOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}