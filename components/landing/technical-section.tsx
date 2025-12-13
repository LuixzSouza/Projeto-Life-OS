// components/landing/technical-section.tsx
"use client";

import { ShieldCheck, Zap, HardDrive, WifiOff, Lock, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Tipagem correta para o ícone
interface FeatureProps {
    icon: LucideIcon;
    title: string;
    desc: string;
    color: string;
    delay: number;
}

const FeatureCard = ({ icon: Icon, title, desc, color, delay }: FeatureProps) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -5 }}
        className="group relative p-6 rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden hover:bg-zinc-900/60 transition-colors"
    >
        {/* Glow de Fundo no Hover */}
        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br", color)} />
        
        {/* Ícone com fundo colorido */}
        <div className={cn("inline-flex p-3 rounded-xl bg-zinc-800/50 mb-4 text-white group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10", color.replace("from-", "text-").split(" ")[0])}>
            <Icon className="h-6 w-6" />
        </div>
        
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all">
            {title}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300">
            {desc}
        </p>
    </motion.div>
);

export default function TechnicalSection() {
    return (
        <section className="py-32 px-6 bg-[#09090b] border-t border-white/5 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            {/* Efeito de "Radar" de fundo */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* --- HEADER --- */}
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest border border-emerald-500/20 mb-6"
                    >
                        <ShieldCheck className="h-3 w-3" /> Arquitetura Blindada
                    </motion.div>
                    
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                        Seus dados, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">suas regras.</span>
                    </h2>
                    
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Esqueça a nuvem pública. O <strong>Life OS</strong> utiliza uma arquitetura de &quot;Cofre Local&quot;. 
                        Tudo fica gravado fisicamente no seu dispositivo, garantindo que ninguém além de você tenha acesso.
                    </p>
                </div>

                {/* --- GRID DE BENEFÍCIOS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    
                    <FeatureCard 
                        icon={HardDrive}
                        title="Propriedade Real"
                        desc="Você não aluga seus dados. Eles vivem num arquivo no seu HD. Faça backup, copie ou mova para um pen-drive quando quiser."
                        color="from-blue-500 to-indigo-500"
                        delay={0.1}
                    />

                    <FeatureCard 
                        icon={WifiOff}
                        title="100% Offline"
                        desc="Sua produtividade não pode depender do Wi-Fi. O sistema funciona perfeitamente sem internet, em qualquer lugar do mundo."
                        color="from-emerald-500 to-teal-500"
                        delay={0.2}
                    />

                    <FeatureCard 
                        icon={Zap}
                        title="Velocidade Nativa"
                        desc="Sem telas de carregamento. A interação é instantânea (0ms de latência de rede), proporcionando uma experiência fluida."
                        color="from-amber-500 to-orange-500"
                        delay={0.3}
                    />

                </div>

                {/* --- CERTIFICAÇÃO TÉCNICA (PROOF) --- */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative p-1 rounded-3xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800"
                >
                    <div className="bg-[#0c0c0e] rounded-[22px] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        
                        <div className="flex flex-col gap-2 max-w-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Engine de Dados</span>
                            </div>
                            <h4 className="text-xl font-bold text-white">Powered by SQLite</h4>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Utilizamos a mesma tecnologia de banco de dados confiada pela <strong>NASA</strong> em missões espaciais e pela <strong>Airbus</strong> em sistemas de voo. Robusto, inquebrável e portátil.
                            </p>
                        </div>

                        {/* Visual Tech Badges */}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center bg-zinc-900/50 border border-white/5 p-3 rounded-xl min-w-[100px]">
                                <span className="text-xs text-zinc-500 uppercase font-bold mb-1">Latência</span>
                                <span className="text-lg font-mono font-bold text-white">0ms</span>
                            </div>
                            <div className="flex flex-col items-center bg-zinc-900/50 border border-white/5 p-3 rounded-xl min-w-[100px]">
                                <span className="text-xs text-zinc-500 uppercase font-bold mb-1">Encryption</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">AES-256</span>
                            </div>
                        </div>

                    </div>
                </motion.div>

            </div>
        </section>
    );
}