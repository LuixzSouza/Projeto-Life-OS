"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, CheckCircle2, HeartPulse, TrendingUp, BookOpen, Activity, Fingerprint, Cpu } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroProps {
  authState: {
    isLoggedIn: boolean;
    isConfigured: boolean;
  };
}

// --- 1. COMPONENTE DO CARD ---
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subtext: string;
  color: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const FeatureCard = ({ icon: Icon, title, value, subtext, color, onMouseEnter, onMouseLeave }: FeatureCardProps) => (
  // O card centralizado em relação ao ponto de rotação
  <div 
    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <div className="
      relative w-64 p-4 rounded-2xl border border-white/10 bg-[#050505]/90 backdrop-blur-md shadow-2xl 
      cursor-pointer transition-all duration-300 pointer-events-auto group/card
      hover:scale-110 hover:bg-[#0A0A0A] hover:border-indigo-500/50 hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)]
    ">
      {/* Linha brilhante no topo */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-inner ring-1 ring-inset ring-white/10 transition-colors group-hover/card:ring-white/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider group-hover/card:text-white transition-colors">Active</span>
        </div>
      </div>
      
      <div>
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">{title}</p>
        <p className="text-xl font-bold text-zinc-100 leading-tight tracking-tight">{value}</p>
        
        {/* Informação Extra */}
        <div className="grid grid-rows-[0fr] group-hover/card:grid-rows-[1fr] transition-all duration-300 ease-out">
          <div className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-indigo-300 font-medium">
              <Activity className="h-3 w-3" /> {subtext}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function HeroSection({ authState }: HeroProps) {
  const { isLoggedIn, isConfigured } = authState;
  const targetUrl = isLoggedIn ? "/dashboard" : (isConfigured ? "/login" : "/setup");

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden pt-20 pb-20">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[#030303] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-indigo-600/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* --- LADO ESQUERDO (Texto) --- */}
        <div className="text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0 relative z-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm group cursor-default hover:border-indigo-500/30 transition-colors"
          >
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">Sistema Operacional Pessoal v1.0</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Sua vida, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 animate-gradient-x">
                Conectada e Local.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-zinc-400 leading-relaxed"
          >
            O <strong>Life OS</strong> centraliza finanças, projetos, estudos e saúde em um único banco de dados SQLite. Sem assinaturas. Privacidade total.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start"
          >
            <Link href={targetUrl} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 text-lg font-bold shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95">
                {isLoggedIn ? "Acessar Dashboard" : "Começar Agora"} 
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#modules" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10">
                Explorar Módulos
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* --- LADO DIREITO: ORBITAIS --- */}
        <div className="relative h-[750px] w-full hidden lg:flex items-center justify-center perspective-1000 overflow-visible">
          
          {/* 1. NÚCLEO CENTRAL "REATOR" - Z-Index 30 (Fixo) */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="absolute z-30 flex items-center justify-center pointer-events-none"
          >
             {/* Efeitos de Energia */}
             <div className="absolute w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
             <div className="absolute w-72 h-72 rounded-full border border-indigo-500/10 border-t-indigo-400/40 animate-[spin_10s_linear_infinite]" />
             <div className="absolute w-60 h-60 rounded-full border border-purple-500/10 border-b-purple-400/40 animate-[spin_15s_linear_infinite_reverse]" />
             <div className="absolute w-44 h-44 rounded-full border border-dashed border-white/5 animate-[spin_25s_linear_infinite]" />

             {/* A Esfera Sólida (Núcleo) */}
             <div className="relative w-36 h-36 rounded-full bg-[#030303] border border-indigo-500/30 shadow-[0_0_80px_-20px_rgba(99,102,241,0.6)] flex items-center justify-center group cursor-pointer pointer-events-auto hover:scale-105 transition-transform duration-500">
                {/* Efeito Radar */}
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(99,102,241,0.2)_360deg)] animate-[spin_4s_linear_infinite]" />
                <div className="absolute inset-1 rounded-full bg-[#050505]" />
                
                {/* Conteúdo */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                    <Cpu className="h-10 w-10 text-indigo-400 animate-pulse drop-shadow-[0_0_15px_rgba(99,102,241,1)]" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold font-mono text-white tracking-[0.2em]">CORE</span>
                        <span className="text-[8px] font-mono text-indigo-400/70">ONLINE</span>
                    </div>
                </div>
             </div>
          </motion.div>


          {/* 2. ORBITA INTERNA (RAIO 225px) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             
             {/* Trilho Visual (Fixo e com Z-index baixo) */}
             <div className="absolute w-[450px] h-[450px] rounded-full border border-white/5 border-dashed z-10" />

             {/* === CARD 1: FINANÇAS === */}
             {/* O container de rotação (div) recebe o Z-Index dinâmico */}
             <div 
                className={cn(
                    "absolute w-[450px] h-[450px] rounded-full transition-all duration-0", // Removido duration no Z para troca instantanea
                    hoveredCard === 'finance' ? "z-[60]" : "z-20" // Se hovered, z-60 (maior que core z-30). Se não, z-20 (atrás core).
                )}
                style={{ 
                    animation: `spin 45s linear infinite`, 
                    animationPlayState: hoveredCard === 'finance' ? 'paused' : 'running' 
                }}
             >
                <div style={{ animation: `spin 45s linear infinite reverse`, animationPlayState: hoveredCard === 'finance' ? 'paused' : 'running' }}>
                    <FeatureCard 
                        icon={Wallet} title="Finanças" value="R$ 12.450" subtext="Patrimônio Consolidado" color="bg-emerald-600"
                        onMouseEnter={() => setHoveredCard('finance')} 
                        onMouseLeave={() => setHoveredCard(null)}
                    />
                </div>
             </div>

             {/* === CARD 2: SAÚDE === */}
             <div 
                className={cn(
                    "absolute w-[450px] h-[450px] rounded-full transition-all duration-0",
                    hoveredCard === 'health' ? "z-[60]" : "z-20"
                )}
                style={{ 
                    animation: `spin 45s linear infinite`, 
                    animationDelay: '-22.5s', 
                    animationPlayState: hoveredCard === 'health' ? 'paused' : 'running' 
                }}
             >
                <div style={{ animation: `spin 45s linear infinite reverse`, animationDelay: '-22.5s', animationPlayState: hoveredCard === 'health' ? 'paused' : 'running' }}>
                    <FeatureCard 
                        icon={HeartPulse} title="Saúde" value="92 pts" subtext="Recuperação Máxima" color="bg-rose-600"
                        onMouseEnter={() => setHoveredCard('health')} 
                        onMouseLeave={() => setHoveredCard(null)}
                    />
                </div>
             </div>
          </div>


          {/* 3. ORBITA EXTERNA (RAIO 350px) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             
             {/* Trilho Visual (z-0 para ficar bem no fundo) */}
             <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5 z-0" />

             {/* === CARD 3: PROJETOS === */}
             <div 
                className={cn(
                    "absolute w-[700px] h-[700px] rounded-full transition-all duration-0",
                    hoveredCard === 'projects' ? "z-[60]" : "z-10" // Normal z-10 (atrás de tudo), Hover z-60 (frente total)
                )}
                style={{ 
                    animation: `spin 60s linear infinite reverse`, 
                    animationPlayState: hoveredCard === 'projects' ? 'paused' : 'running' 
                }}
             >
                <div style={{ animation: `spin 60s linear infinite`, animationPlayState: hoveredCard === 'projects' ? 'paused' : 'running' }}>
                    <FeatureCard 
                        icon={CheckCircle2} title="Projetos" value="3 Ativos" subtext="Sprint Finalizando" color="bg-blue-600"
                        onMouseEnter={() => setHoveredCard('projects')} 
                        onMouseLeave={() => setHoveredCard(null)}
                    />
                </div>
             </div>

             {/* === CARD 4: ESTUDOS === */}
             <div 
                className={cn(
                    "absolute w-[700px] h-[700px] rounded-full transition-all duration-0",
                    hoveredCard === 'studies' ? "z-[60]" : "z-10"
                )}
                style={{ 
                    animation: `spin 60s linear infinite reverse`, 
                    animationDelay: '-20s',
                    animationPlayState: hoveredCard === 'studies' ? 'paused' : 'running'
                }}
             >
                <div style={{ animation: `spin 60s linear infinite`, animationDelay: '-20s', animationPlayState: hoveredCard === 'studies' ? 'paused' : 'running' }}>
                    <FeatureCard 
                        icon={BookOpen} title="Estudos" value="React JS" subtext="Módulo Avançado" color="bg-purple-600"
                        onMouseEnter={() => setHoveredCard('studies')} 
                        onMouseLeave={() => setHoveredCard(null)}
                    />
                </div>
             </div>

             {/* === CARD 5: METAS === */}
             <div 
                className={cn(
                    "absolute w-[700px] h-[700px] rounded-full transition-all duration-0",
                    hoveredCard === 'goals' ? "z-[60]" : "z-10"
                )}
                style={{ 
                    animation: `spin 60s linear infinite reverse`, 
                    animationDelay: '-40s',
                    animationPlayState: hoveredCard === 'goals' ? 'paused' : 'running'
                }}
             >
                <div style={{ animation: `spin 60s linear infinite`, animationDelay: '-40s', animationPlayState: hoveredCard === 'goals' ? 'paused' : 'running' }}>
                    <FeatureCard 
                        icon={TrendingUp} title="Meta" value="65%" subtext="Viagem Europa" color="bg-amber-600"
                        onMouseEnter={() => setHoveredCard('goals')} 
                        onMouseLeave={() => setHoveredCard(null)}
                    />
                </div>
             </div>

          </div>

        </div>
      </div>
    </section>
  );
}