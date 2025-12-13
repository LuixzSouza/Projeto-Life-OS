// components/landing/hero-section.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, CheckCircle2, HeartPulse, Lock, TrendingUp, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroProps {
    authState: {
        isLoggedIn: boolean;
        isConfigured: boolean;
    };
}

// Pequeno card flutuante para compor o visual (Tipagem estrita)
interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    value: string;
    color: string;
    delay: number;
    className?: string;
}

const FeatureCard = ({ icon: Icon, title, value, color, delay, className }: FeatureCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.5, type: "spring" }}
        className={cn(
            "absolute flex flex-col gap-2 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl w-40 hover:scale-105 transition-transform cursor-default",
            className
        )}
    >
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white", color)}>
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{title}</p>
            <p className="text-sm font-semibold text-zinc-100">{value}</p>
        </div>
    </motion.div>
);

export default function HeroSection({ authState }: HeroProps) {
    const { isLoggedIn, isConfigured } = authState;
    const targetUrl = isLoggedIn ? "/dashboard" : (isConfigured ? "/login" : "/setup");

    return (
        <section className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden pt-20 pb-20">
            
            {/* BACKGROUND SUAVE E MODERNO */}
            <div className="absolute inset-0 bg-[#050505]">
                {/* Degradê central sutil */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="container relative z-10 px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                
                {/* LADO ESQUERDO: TEXTO E CTA */}
                <div className="text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
                    
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-medium text-zinc-300">Versão 1.0 Disponível</span>
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]"
                    >
                        Sua vida, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
                            Simples e Privada.
                        </span>
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-lg text-zinc-400 leading-relaxed"
                    >
                        Chega de usar 10 apps diferentes. O <strong>Life OS</strong> centraliza suas finanças, tarefas, estudos e saúde em um único lugar.
                        <br className="hidden md:block" /> Tudo salvo no seu computador. Sem assinaturas. Sem rastreamento.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start"
                    >
                        <Link href={targetUrl} className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 text-lg font-bold shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                                {isLoggedIn ? "Abrir Meu Life OS" : "Começar Agora"} 
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="#modules" className="w-full sm:w-auto">
                            <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10">
                                Ver Funcionalidades
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="flex items-center justify-center lg:justify-start gap-6 text-sm text-zinc-500 pt-4"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Gratuito
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Offline
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Portátil
                        </div>
                    </motion.div>
                </div>

                {/* LADO DIREITO: VISUALIZAÇÃO ABSTRATA (BENTO GRID FLUTUANTE) */}
                <div className="relative h-[500px] w-full hidden lg:block">
                    {/* Círculo decorativo central */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-dashed border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

                    {/* Cards Flutuando em Órbita */}
                    
                    {/* Finanças */}
                    <FeatureCard 
                        icon={Wallet} title="Patrimônio" value="R$ 12.450,00" color="bg-emerald-500" delay={0.5} 
                        className="top-[10%] left-[20%]"
                    />

                    {/* Saúde */}
                    <FeatureCard 
                        icon={HeartPulse} title="Hoje" value="5km Corrida" color="bg-rose-500" delay={0.7} 
                        className="bottom-[20%] left-[10%]"
                    />

                    {/* Projetos */}
                    <FeatureCard 
                        icon={CheckCircle2} title="Tarefas" value="4 Pendentes" color="bg-blue-500" delay={0.9} 
                        className="top-[40%] right-[10%]"
                    />

                    {/* Investimentos / Metas */}
                    <FeatureCard 
                        icon={TrendingUp} title="Meta: Carro" value="65% Concluído" color="bg-amber-500" delay={1.1} 
                        className="bottom-[10%] right-[30%]"
                    />

                    {/* Estudos */}
                    <FeatureCard 
                        icon={BookOpen} title="Estudos" value="Revisar JS" color="bg-purple-500" delay={1.3} 
                        className="top-[5%] right-[25%]"
                    />

                    {/* Central: O Cérebro/User */}
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.4)] flex items-center justify-center z-10"
                    >
                        <Lock className="h-12 w-12 text-white" />
                        <div className="absolute -bottom-8 text-xs font-mono text-zinc-500 bg-black/50 px-2 py-1 rounded">
                            life_os.db
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}