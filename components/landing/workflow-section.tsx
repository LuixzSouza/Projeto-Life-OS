// components/landing/workflow-section.tsx
"use client";

import React from "react";
import { BrainCircuit, Calendar, Activity, Layers } from "lucide-react";
import { motion } from "framer-motion";

// 1. Definição de Tipos Estritos
type AccentColor = 'rose' | 'indigo' | 'emerald';

interface WorkflowCardProps {
    icon: React.ReactNode;
    iconColor: string;
    bgIcon: string;
    label: string;
    title: React.ReactNode;
    delay: number;
    accentColor: AccentColor;
    isSystem?: boolean;
}

export default function WorkflowSection() {
  return (
    <section id="ai" className="py-32 px-6 border-t border-white/5 bg-[#050505] relative overflow-hidden min-h-screen flex items-center">
        
        {/* --- BACKGROUND --- */}
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none opacity-40 z-0" />
        <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none opacity-30 z-0" />

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20 relative z-10 w-full">
            
            {/* --- ESQUERDA: TEXTO --- */}
            <div className="flex-1 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                >
                    <Layers className="h-3 w-3" /> Contexto Unificado
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                        Seus dados não vivem<br />
                        em silos isolados.
                    </h2>
                </motion.div>
                
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-zinc-400 text-lg leading-relaxed"
                >
                    O <strong>Life OS</strong> entende que sua produtividade depende da sua saúde física. Se você dormiu mal, o sistema ajusta suas metas. Se gastou demais, ele alerta sobre o orçamento. Tudo conectado via SQLite local.
                </motion.p>

                <div className="space-y-6 pt-4">
                    {[
                        { title: "Saúde & Produtividade", desc: "Dados de sono e treino influenciam a agenda." },
                        { title: "Finanças & Metas", desc: "Compras ajustam automaticamente orçamentos futuros." },
                        { title: "Privacidade Total", desc: "Seus dados processados localmente, sem nuvem externa." }
                    ].map((item, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + (i * 0.1) }}
                            className="flex gap-4 group cursor-default"
                        >
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0 group-hover:bg-purple-400 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-300" />
                            <div>
                                <h4 className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{item.title}</h4>
                                <p className="text-zinc-500 text-sm leading-snug">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- DIREITA: WORKFLOW --- */}
            <div className="flex-1 w-full flex justify-center perspective-1000">
                <div className="relative w-full max-w-md">
                    
                    {/* TRILHA DA LINHA DO TEMPO */}
                    <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-zinc-800/30 rounded-full overflow-hidden">
                        {/* ✅ ANIMAÇÃO DO FEIXE DE LUZ RESTAURADA E MELHORADA */}
                        <motion.div 
                            // Aumentei a altura (h-150px) e o brilho para ficar mais visível
                            className="absolute top-0 w-full h-[150px] bg-gradient-to-b from-transparent via-indigo-400/80 to-transparent shadow-[0_0_20px_2px_rgba(99,102,241,0.6)]"
                            // Começa bem acima (-40%) e termina bem abaixo (140%) para garantir o loop suave sem "pulo"
                            animate={{ top: ["-40%", "140%"] }}
                            transition={{ 
                                duration: 3, // Duração do ciclo
                                repeat: Infinity, // Repete para sempre
                                ease: "easeInOut", // Acelera no meio, suave nas pontas
                                repeatDelay: 0 // Sem pausa para fluxo contínuo
                            }}
                        />
                    </div>

                    {/* CARD 1: INPUT DE DADOS (SAÚDE) */}
                    <WorkflowCard 
                        icon={<Activity className="h-5 w-5" />}
                        iconColor="text-rose-400"
                        bgIcon="bg-rose-500/10"
                        accentColor="rose"
                        label="Dados de Entrada"
                        title={
                            <>
                                <span className="block text-xs text-zinc-500 mb-1 font-mono">Input: HealthMetric</span>
                                Sono detectado: <span className="text-rose-400 font-bold">5h 20m</span>. Recuperação baixa.
                            </>
                        }
                        delay={0.2}
                    />

                    {/* CARD 2: PROCESSAMENTO (IA) */}
                    <WorkflowCard 
                        icon={<BrainCircuit className="h-5 w-5" />}
                        iconColor="text-indigo-400"
                        bgIcon="bg-indigo-500/10"
                        accentColor="indigo"
                        label="Life OS Intelligence"
                        title={
                            <>
                                <span className="block text-xs text-zinc-500 mb-1 font-mono">Process: Settings/AI</span>
                                Analisando contexto... Risco de fadiga cognitiva elevado.
                            </>
                        }
                        delay={0.4}
                        isSystem={true}
                    />

                    {/* CARD 3: AÇÃO (AGENDA) */}
                    <WorkflowCard 
                        icon={<Calendar className="h-5 w-5" />}
                        iconColor="text-emerald-400"
                        bgIcon="bg-emerald-500/10"
                        accentColor="emerald"
                        label="Ação Automática"
                        title={
                            <>
                                <span className="block text-xs text-zinc-500 mb-1 font-mono">Output: Task/Event</span>
                                <span className="text-emerald-400 font-bold">✓ Agenda Otimizada.</span> Sessão de estudo reduzida em 30min.
                            </>
                        }
                        delay={0.6}
                    />

                </div>
            </div>

        </div>
    </section>
  );
}

// --- SUB-COMPONENTE TIPADO ---
function WorkflowCard({ 
    icon, 
    iconColor, 
    bgIcon, 
    label, 
    title, 
    delay, 
    accentColor, 
    isSystem = false 
}: WorkflowCardProps) {

    // Mapas de cores tipados
    const borderColors: Record<AccentColor, string> = {
        rose: "group-hover:border-rose-500/30",
        indigo: "group-hover:border-indigo-500/30",
        emerald: "group-hover:border-emerald-500/30",
    };

    const glowColors: Record<AccentColor, string> = {
        rose: "group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]",
        indigo: "group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]",
        emerald: "group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]",
    };

    const dotColors: Record<AccentColor, string> = {
        rose: "group-hover:bg-rose-500 group-hover:border-rose-900/50",
        indigo: "group-hover:bg-indigo-500 group-hover:border-indigo-900/50",
        emerald: "group-hover:bg-emerald-500 group-hover:border-emerald-900/50",
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ margin: "-50px" }}
            transition={{ delay, duration: 0.5 }}
            className={`
                group relative ml-12 mb-6 p-5 rounded-2xl
                bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/5
                flex items-start gap-4 transition-all duration-500
                hover:-translate-y-1 hover:bg-[#0F0F0F]
                ${borderColors[accentColor]}
                ${glowColors[accentColor]}
                ${isSystem ? 'shadow-[0_0_40px_-10px_rgba(99,102,241,0.1)] border-indigo-500/20 ring-1 ring-indigo-500/10' : 'shadow-lg'}
            `}
        >
            {/* Ponto na linha do tempo */}
            <div className={`
                absolute -left-[39px] top-8 -translate-y-1/2 w-4 h-4 rounded-full 
                border-[3px] border-[#050505] z-10 transition-all duration-300 
                bg-zinc-800 shadow-sm
                ${dotColors[accentColor]}
            `} />
            
            {/* Ícone */}
            <div className={`mt-1 h-10 w-10 shrink-0 rounded-lg ${bgIcon} flex items-center justify-center ${iconColor} shadow-inner ring-1 ring-white/5 group-hover:scale-105 transition-transform duration-500`}>
                {icon}
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-70 ${iconColor}`}>
                    {label}
                </div>
                <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors leading-relaxed truncate-multiline">
                    {title}
                </div>
            </div>

            {/* Indicador de Pulsação (Apenas para Sistema) */}
            {isSystem && (
                <div className="absolute top-4 right-4 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </div>
            )}
        </motion.div>
    )
}