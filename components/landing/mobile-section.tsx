// components/landing/mobile-section.tsx
"use client";

import { Smartphone, Command, CheckCircle2, TrendingUp, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileSection() {
  return (
    <section className="py-32 px-6 bg-[#050505] border-t border-white/5 relative overflow-hidden">
      
      {/* Background: Grid Tático */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto flex flex-col items-center relative z-10">
        
        {/* --- HEADER CENTRALIZADO --- */}
        <div className="text-center mb-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                <Smartphone className="h-3 w-3" /> Acesso Universal
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Controle total.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">Em qualquer lugar.</span>
            </h2>
            <p className="text-lg text-zinc-500 leading-relaxed">
                Não é necessário baixar nada na loja. Seu sistema roda direto no navegador do seu iPhone ou Android, otimizado para o toque e com desempenho nativo.
            </p>
        </div>

        {/* --- MOCKUP HIGH-FIDELITY --- */}
        <div className="relative group">
            
            {/* Glow Traseiro (Atmosfera) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[600px] bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-700" />

            {/* O DISPOSITIVO */}
            <motion.div 
                initial={{ y: 40, opacity: 0, rotateX: 10 }}
                whileInView={{ y: 0, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative w-[300px] h-[620px] rounded-[50px] border-[6px] border-[#1a1a1a] bg-black shadow-2xl overflow-hidden ring-1 ring-white/10"
            >
                {/* Dynamic Island */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-30 flex items-center justify-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                    <div className="w-16 h-1.5 rounded-full bg-[#1a1a1a]" />
                </div>

                {/* --- TELA DO APP (Interface Densa) --- */}
                <div className="w-full h-full pt-16 px-5 pb-8 flex flex-col bg-[#09090b] relative">
                    
                    {/* Header da Tela */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Dashboard</span>
                            <span className="text-lg font-bold text-white">Visão Geral</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                            LA
                        </div>
                    </div>

                    {/* Card 1: Status Financeiro (Compacto) */}
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 mb-3">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase">Entradas</span>
                            </div>
                            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+12%</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">R$ 12.450</div>
                    </div>

                    {/* Card 2: Quick Tasks */}
                    <div className="flex-1 rounded-2xl bg-zinc-900/50 border border-white/5 p-4 mb-20">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Foco de Hoje</span>
                            <span className="text-[10px] text-zinc-600">3 Pendentes</span>
                        </div>
                        
                        {/* Lista de Tarefas Mobile */}
                        <div className="space-y-2">
                            {[
                                { t: "Deploy na Vercel", done: true },
                                { t: "Revisar Design System", done: false },
                                { t: "Responder E-mails", done: false },
                                { t: "Treino: Costas", done: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-white/5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${item.done ? "bg-indigo-500 border-indigo-500" : "border-zinc-700"}`}>
                                        {item.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className={`text-xs ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{item.t}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Action Bar (FAB) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                        <button className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700 shadow-lg active:scale-90 transition-transform">
                            <Command className="h-5 w-5" />
                        </button>
                        <button className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-90 transition-transform">
                            <Plus className="h-8 w-8" />
                        </button>
                        <button className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700 shadow-lg active:scale-90 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>

        {/* --- FEATURES FLUTUANTES (Ao redor do celular) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full text-center">
            <div className="space-y-2">
                <h3 className="text-white font-bold">Sem Instalação</h3>
                <p className="text-sm text-zinc-500 px-4">Adicione à tela inicial e use instantaneamente. Sem ocupar memória.</p>
            </div>
            <div className="space-y-2">
                <h3 className="text-white font-bold">Offline-First</h3>
                <p className="text-sm text-zinc-500 px-4">Consulte suas tarefas e saldo mesmo no modo avião.</p>
            </div>
            <div className="space-y-2">
                <h3 className="text-white font-bold">Sincronia Real</h3>
                <p className="text-sm text-zinc-500 px-4">O que você faz no PC aparece no celular em milissegundos.</p>
            </div>
        </div>

      </div>
    </section>
  );
}