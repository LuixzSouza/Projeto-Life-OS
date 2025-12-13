// components/landing/workflow-section.tsx
"use client";

import { Activity, ArrowDown, Calendar, Zap, Bell, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WorkflowSection() {
  return (
    <section className="py-32 px-6 border-t border-white/5 bg-[#050505] relative overflow-hidden">
        
        {/* Background Grids decorativos */}
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20 relative z-10">
            
            {/* --- LADO ESQUERDO: TEXTO --- */}
            <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest border border-indigo-500/20">
                    <Zap className="h-3 w-3" /> Neural Sync
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                    Não são apenas apps.<br />
                    É um <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">organismo vivo.</span>
                </h2>
                
                <p className="text-zinc-400 text-lg leading-relaxed">
                    A mágica acontece nas conexões. Diferente de usar 10 apps separados, o <strong>Life OS</strong> cruza dados para gerar insights reais. Se sua recuperação física está baixa, a agenda se adapta. Se o gasto aumentou, o alerta é imediato.
                </p>

                <div className="space-y-4 pt-2">
                    {[
                        { title: "Contexto Cross-Module", desc: "A IA lê dados de saúde para otimizar seus estudos." },
                        { title: "Automação de Rotina", desc: "Workflows que rodam em background sem você tocar." },
                        { title: "Privacidade First", desc: "Seus dados cruzados localmente, sem sair da sua máquina." }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                            <div>
                                <h4 className="text-white font-bold text-sm">{item.title}</h4>
                                <p className="text-zinc-500 text-sm">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- LADO DIREITO: VISUALIZAÇÃO DE FLUXO (WORKFLOW) --- */}
            <div className="flex-1 w-full flex justify-center">
                <div className="relative w-full max-w-md">
                    
                    {/* Linha conectora animada */}
                    <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-zinc-800">
                        <motion.div 
                            className="w-full h-[30%] bg-gradient-to-b from-transparent via-indigo-500 to-transparent"
                            animate={{ top: ["-30%", "130%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    </div>

                    {/* CARD 1: GATILHO (SAÚDE) */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative ml-8 mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4 shadow-xl z-10"
                    >
                        <div className="absolute -left-[37px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500 border-4 border-[#050505] flex items-center justify-center">
                            <div className="w-full h-full bg-rose-500 animate-ping rounded-full opacity-75" />
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Gatilho Detectado</div>
                            <div className="text-sm font-medium text-white">Recuperação do Sono &lt; 60%</div>
                        </div>
                    </motion.div>

                    {/* CARD 2: PROCESSAMENTO (IA) */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative ml-8 mb-6 bg-zinc-900 border border-indigo-500/30 p-4 rounded-xl flex items-center gap-4 shadow-[0_0_30px_rgba(99,102,241,0.1)] z-10"
                    >
                        <div className="absolute -left-[37px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[#050505]" />
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Sistema (IA)</div>
                            <div className="text-sm font-medium text-white">Reajustando carga de tarefas...</div>
                        </div>
                    </motion.div>

                    {/* CARD 3: AÇÃO (AGENDA) */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="relative ml-8 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4 shadow-xl z-10"
                    >
                        <div className="absolute -left-[37px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#050505]" />
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ação Automática</div>
                            <div className="text-sm font-medium text-white">Deep Work cancelado. Modo Leve ativado.</div>
                        </div>
                        <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                    </motion.div>

                </div>
            </div>

        </div>
    </section>
  );
}