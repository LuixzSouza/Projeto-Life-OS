"use client";

import { useState, useEffect, useCallback } from "react";
import { completeOnboarding } from "@/app/actions";
import { Wallet, CheckSquare, BrainCircuit, Sparkles, X, ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Configuração dos Slides
const SLIDES = [
    {
        id: "intro",
        icon: <Sparkles className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />,
        title: "Bem-vindo ao Life OS",
        desc: "Seu sistema operacional pessoal. Centralize vida, trabalho e finanças em um ambiente local e seguro.",
        glowColor: "from-indigo-500/20 via-purple-500/20 to-zinc-900/0",
        iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600"
    },
    {
        id: "finance",
        icon: <Wallet className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />,
        title: "Finanças Blindadas",
        desc: "Acompanhe seu patrimônio em tempo real. Registre entradas, saídas e veja gráficos detalhados sem planilhas.",
        glowColor: "from-emerald-500/20 via-teal-500/20 to-zinc-900/0",
        iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600"
    },
    {
        id: "projects",
        icon: <CheckSquare className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />,
        title: "Gestão de Projetos",
        desc: "Do planejamento à execução. Quebre grandes objetivos em tarefas menores e acompanhe seu progresso.",
        glowColor: "from-blue-500/20 via-cyan-500/20 to-zinc-900/0",
        iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600"
    },
    {
        id: "ai",
        icon: <BrainCircuit className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />,
        title: "Inteligência Local",
        desc: "Sua IA pessoal analisa seus dados para dar insights reais, rodando 100% no seu navegador ou localmente.",
        glowColor: "from-rose-500/20 via-orange-500/20 to-zinc-900/0",
        iconBg: "bg-gradient-to-br from-rose-500 to-orange-600"
    }
];

export function WelcomeTour() {
    // Começa fechado para evitar "flash" de conteúdo incorreto e erros de hidratação
    const [open, setOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    // CORREÇÃO DO ERRO:
    // Movemos a verificação para um efeito, mas usamos setTimeout para quebrar
    // o ciclo síncrono de renderização.
    useEffect(() => {
        const hasSeenTour = localStorage.getItem("life-os-tour-completed");
        
        if (!hasSeenTour) {
            // setTimeout com 0ms joga a execução para o final da pilha de eventos,
            // evitando o aviso de "setState in effect" e renderização em cascata.
            const timer = setTimeout(() => {
                setOpen(true);
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, []);

    // Variáveis para o efeito de Tilt 3D
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [5, -5]);
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((event.clientX - centerX) / 4);
        y.set((event.clientY - centerY) / 4);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleFinish = useCallback(async () => {
        setOpen(false);
        // Persistência local imediata
        localStorage.setItem("life-os-tour-completed", "true");
        
        // Persistência no banco (Server Action)
        try {
            await completeOnboarding();
        } catch (error) {
            console.error("Falha ao salvar onboarding no servidor:", error);
        }
    }, []);

    const handleNext = useCallback(() => {
        if (currentSlide < SLIDES.length - 1) {
            setDirection(1);
            setCurrentSlide((curr) => curr + 1);
        } else {
            handleFinish();
        }
    }, [currentSlide, handleFinish]);

    const handlePrev = useCallback(() => {
        if (currentSlide > 0) {
            setDirection(-1);
            setCurrentSlide((curr) => curr - 1);
        }
    }, [currentSlide]);

    useEffect(() => {
        if (!open) return; // Só escuta teclado se estiver aberto

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") handleFinish();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, handleNext, handlePrev, handleFinish]);

    if (!open) return null;

    const slide = SLIDES[currentSlide];
    const isLastSlide = currentSlide === SLIDES.length - 1;

    return (
        <div className="fixed inset-0 w-full min-h-[100vh] z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            
            {/* GLOW DE FUNDO */}
            <motion.div 
                animate={{ 
                    opacity: [0.4, 0.6, 0.4],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className={cn(
                    "absolute inset-0 z-0 bg-gradient-radial transition-all duration-1000 ease-in-out blur-3xl",
                    slide.glowColor
                )}
            />

            {/* CARTÃO 3D */}
            <motion.div 
                style={{ rotateX, rotateY, perspective: 1000 }}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative z-10 w-full max-w-[500px] bg-card/90 dark:bg-zinc-950/90 border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl"
            >
                {/* Efeito de Brilho */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                <button 
                    onClick={handleFinish}
                    className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-50"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center pt-14 pb-8 px-8 min-h-[520px]">
                    
                    {/* ÁREA DO ÍCONE */}
                    <div className="relative mb-10 h-32 flex items-center justify-center">
                        <AnimatePresence mode="popLayout" custom={direction}>
                            <motion.div
                                key={currentSlide}
                                custom={direction}
                                initial={{ opacity: 0, scale: 0.4, rotateY: direction * 90 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                exit={{ opacity: 0, scale: 0.4, rotateY: direction * -90 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className={cn(
                                    "w-32 h-32 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-7 ring-1 ring-white/20",
                                    slide.iconBg
                                )}
                            >
                                {slide.icon}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* TEXTO */}
                    <div className="space-y-4 max-w-sm flex-1 relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                                transition={{ duration: 0.4 }}
                            >
                                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                                    {slide.title}
                                </h2>
                                <p className="text-muted-foreground text-base leading-relaxed font-medium">
                                    {slide.desc}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* RODAPÉ */}
                    <div className="w-full mt-12 space-y-8">
                        
                        {/* Indicadores */}
                        <div className="flex justify-center gap-3">
                            {SLIDES.map((_, idx) => (
                                <motion.button 
                                    key={idx}
                                    onClick={() => {
                                        setDirection(idx > currentSlide ? 1 : -1);
                                        setCurrentSlide(idx);
                                    }}
                                    className="relative h-2 rounded-full overflow-hidden bg-muted"
                                    initial={false}
                                    animate={{ 
                                        width: idx === currentSlide ? 32 : 8,
                                        backgroundColor: idx === currentSlide ? "var(--primary)" : "var(--muted)"
                                    }}
                                >
                                    {idx === currentSlide && (
                                        <motion.div 
                                            layoutId="activeIndicator"
                                            className="absolute inset-0 bg-primary"
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        {/* Botões */}
                        <div className="flex items-center justify-between gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={handlePrev}
                                disabled={currentSlide === 0}
                                className={cn(
                                    "text-muted-foreground hover:text-foreground transition-opacity",
                                    currentSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
                                )}
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                            </Button>

                            <Button 
                                onClick={handleNext} 
                                size="lg"
                                className={cn(
                                    "rounded-full px-8 font-semibold shadow-xl transition-all hover:scale-105 active:scale-95 group",
                                    isLastSlide 
                                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0" 
                                        : "bg-primary text-primary-foreground"
                                )}
                            >
                                {isLastSlide ? (
                                    <span className="flex items-center gap-2">
                                        Vamos lá <Rocket className="w-4 h-4 group-hover:animate-bounce" />
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        Próximo <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}