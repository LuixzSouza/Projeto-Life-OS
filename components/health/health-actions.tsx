"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Moon, User, Dumbbell, Footprints } from "lucide-react";
import Link from "next/link";
import { GymForm } from "@/components/health/gym/gym-form";
import { RunForm } from "@/components/health/running/run-form";

export function HealthActions() {
    const [gymOpen, setGymOpen] = useState(false);
    const [runOpen, setRunOpen] = useState(false);

    return (
        <div className="flex flex-wrap gap-2 items-center">
            
            {/* Navegação Rápida */}
            <div className="flex gap-2 mr-2">
                <Link href="/health/nutrition">
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-muted-foreground hover:text-foreground">
                        <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Nutrição</span>
                    </Button>
                </Link>
                <Link href="/health/sleep">
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-muted-foreground hover:text-foreground">
                        <Moon className="h-4 w-4" /> <span className="hidden sm:inline">Sono</span>
                    </Button>
                </Link>
                <Link href="/health/body">
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-muted-foreground hover:text-foreground">
                        <User className="h-4 w-4" /> <span className="hidden sm:inline">Corpo</span>
                    </Button>
                </Link>
            </div>

            <div className="w-px h-6 bg-border mx-1 hidden md:block" />

            {/* Modal de Treino de Força */}
            <Dialog open={gymOpen} onOpenChange={setGymOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-9 shadow-sm">
                        <Dumbbell className="h-4 w-4" /> Registrar Treino
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5 text-primary" /> Ficha de Treino
                        </DialogTitle>
                    </DialogHeader>
                    {/* Passamos uma função para fechar o modal após o sucesso */}
                    <GymForm onSuccess={() => setGymOpen(false)} />
                </DialogContent>
            </Dialog>

            {/* Modal de Corrida */}
            <Dialog open={runOpen} onOpenChange={setRunOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-9 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30">
                        <Footprints className="h-4 w-4" /> Corrida
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Footprints className="h-5 w-5 text-blue-500" /> Registrar Corrida
                        </DialogTitle>
                    </DialogHeader>
                    <RunForm onSuccess={() => setRunOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}