"use client";

import { useState } from "react";
import { 
    Dialog, 
    DialogContent,
    DialogTitle // ✅ 1. Importar o DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/app/actions";
import { Wallet, CheckSquare, BrainCircuit, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
    {
        id: "intro",
        icon: "👋",
        title: "Bem-vindo ao Life OS",
        desc: "Seu sistema operacional pessoal para gerenciar vida, trabalho e estudos em um só lugar.",
        color: "bg-zinc-900"
    },
    {
        id: "finance",
        icon: <Wallet className="h-12 w-12 text-emerald-500" />,
        title: "Controle Financeiro",
        desc: "Gerencie contas, registre gastos e acompanhe seu patrimônio. Tudo integrado e local.",
        color: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
        id: "projects",
        icon: <CheckSquare className="h-12 w-12 text-indigo-500" />,
        title: "Projetos & Tarefas",
        desc: "Organize seus objetivos em projetos e quebre em tarefas menores. Use o método Kanban ou Lista.",
        color: "bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
        id: "ai",
        icon: <BrainCircuit className="h-12 w-12 text-purple-500" />,
        title: "Inteligência Artificial",
        desc: "Seu assistente pessoal (GPT/Ollama) tem acesso aos seus dados para te dar conselhos reais.",
        color: "bg-purple-50 dark:bg-purple-950/20"
    }
];

export function WelcomeTour() {
    const [open, setOpen] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(s => s + 1);
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        await completeOnboarding();
        setOpen(false);
    };

    const slide = SLIDES[currentSlide];

    return (
        <Dialog open={open} onOpenChange={() => {}}> 
            <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950">
                
                {/* ✅ 2. Adicionar o Título Invisível (Acessibilidade) */}
                <DialogTitle className="sr-only">
                    Tour de Boas-vindas
                </DialogTitle>

                <div className="flex flex-col h-[450px]">
                    
                    {/* ÁREA VISUAL (TOPO) */}
                    <div className={`h-1/2 flex items-center justify-center transition-colors duration-500 ${slide.color}`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={slide.id}
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-6xl mb-4 drop-shadow-sm">
                                    {typeof slide.icon === 'string' ? slide.icon : slide.icon}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ÁREA DE TEXTO (BAIXO) */}
                    <div className="h-1/2 p-8 flex flex-col justify-between text-center bg-white dark:bg-zinc-950">
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {slide.title}
                            </h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                                {slide.desc}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Indicadores (Bolinhas) */}
                            <div className="flex justify-center gap-2">
                                {SLIDES.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            idx === currentSlide ? "w-6 bg-zinc-900 dark:bg-zinc-100" : "w-1.5 bg-zinc-200 dark:bg-zinc-800"
                                        }`} 
                                    />
                                ))}
                            </div>

                            <Button 
                                onClick={handleNext} 
                                className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 h-11 rounded-xl text-base shadow-lg shadow-zinc-500/20"
                            >
                                {currentSlide === SLIDES.length - 1 ? (
                                    <span className="flex items-center gap-2">Começar a Usar <Check className="w-4 h-4" /></span>
                                ) : (
                                    <span className="flex items-center gap-2">Próximo <ArrowRight className="w-4 h-4" /></span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}