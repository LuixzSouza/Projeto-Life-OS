// app/login/LoginPageClient.tsx
"use client";

import { useState, useEffect } from "react";
import { authenticate } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Command, BrainCircuit, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Conteúdo rotativo (Showcase)
const FEATURES = [
    {
        title: "Central de Comando",
        desc: "Finanças, Projetos e Saúde em um único dashboard unificado e inteligente.",
        icon: <Command className="w-6 h-6 text-white" />,
        color: "bg-indigo-500"
    },
    {
        title: "Cérebro Digital",
        desc: "IA integrada que entende o contexto da sua vida e sugere otimizações reais.",
        icon: <BrainCircuit className="w-6 h-6 text-white" />,
        color: "bg-purple-500"
    },
    {
        title: "Cofre Local",
        desc: "Arquitetura SQLite. Seus dados são seus, criptografados no seu dispositivo.",
        icon: <ShieldCheck className="w-6 h-6 text-white" />,
        color: "bg-emerald-500"
    },
];

export default function LoginPageClient() { // Renomeado para LoginPageClient
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentFeature, setCurrentFeature] = useState(0);

    // Rotação automática dos slides
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentFeature((prev) => (prev + 1) % FEATURES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        const result = await authenticate(formData);
        
        if (result?.error) {
            toast.error(result.error);
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-[#050505] text-white overflow-hidden">
            
            {/* --- COLUNA ESQUERDA: FORMULÁRIO --- */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 relative z-10">
                
                {/* Logo Mobile */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2 font-bold text-xl">
                    <div className="h-8 w-8 bg-gradient-to-tr from-zinc-800 to-black border border-white/10 rounded-lg flex items-center justify-center">
                        <Command className="h-4 w-4 text-white" />
                    </div>
                    Life OS
                </div>

                <div className="w-full max-w-sm space-y-8">
                    
                    {/* Header do Form */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Acesso ao Sistema</h1>
                        <p className="text-zinc-400 text-sm">Digite suas credenciais para desbloquear o dashboard.</p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            
                            {/* Input Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Email</Label>
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="seu.email.admin@lifeos.local" 
                                    required 
                                    className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20 h-12"
                                />
                            </div>

                            {/* Input Senha */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Chave de Acesso</Label>
                                </div>
                                <div className="relative">
                                    <Input 
                                        id="password" 
                                        name="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20 h-12 pr-10"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02]" 
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" /> 
                            ) : (
                                <span className="flex items-center gap-2">Iniciar Sessão <ArrowRight className="h-4 w-4" /></span>
                            )}
                        </Button>
                    </form>
                    
                    {/* AVISO E CONTA DE TESTE */}
                    <div className="space-y-4 pt-4 border-t border-white/10 mt-6">
                        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-xs space-y-2">
                            <h4 className="font-bold text-white flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-400" /> Conta de Demonstração (Teste)
                            </h4>
                            <p className="text-zinc-400">
                                Se você acabou de instalar, use estas credenciais para testar o sistema imediatamente:
                            </p>
                            <code className="block p-2 rounded bg-black/40 text-emerald-300 font-mono">
                                Email: <strong>demo@lifeos.local</strong> <br/>
                                Senha: <strong>teste</strong>
                            </code>
                        </div>

                        <div className="text-center">
                            <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2 group">
                                <ArrowRight className="h-3 w-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                Voltar para o Guia de Setup (Landing Page)
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                    System v1.0 • Secure Connection
                </div>
            </div>

            {/* --- COLUNA DIREITA: VISUAL SHOWCASE --- */}
            <div className="hidden lg:flex flex-col justify-center items-center relative bg-black border-l border-white/5 overflow-hidden">
                
                {/* Background Effects (Grid + Glow) */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-50" />
                <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-indigo-900/20 to-transparent pointer-events-none" />
                
                <div className="relative z-10 w-full max-w-md px-12">
                    
                    {/* Branding Hero */}
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 bg-gradient-to-tr from-zinc-800 to-black border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                                <Command className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight leading-none">Life OS</h2>
                                <span className="text-xs text-indigo-400 font-mono">Enterprise Edition</span>
                            </div>
                        </div>
                    </div>

                    {/* Slider de Features */}
                    <div className="relative h-[220px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFeature}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute inset-0"
                            >
                                <div className="flex flex-col gap-6">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                                        FEATURES[currentFeature].color
                                    )}>
                                        {FEATURES[currentFeature].icon}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">
                                            {FEATURES[currentFeature].title}
                                        </h3>
                                        <p className="text-zinc-400 text-lg leading-relaxed">
                                            {FEATURES[currentFeature].desc}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Progress Indicators */}
                    <div className="flex gap-2 mt-8">
                        {FEATURES.map((_, idx) => (
                            <div 
                                key={idx}
                                className={cn(
                                    "h-1 rounded-full transition-all duration-500",
                                    idx === currentFeature ? "w-12 bg-white" : "w-2 bg-white/20"
                                )}
                            />
                        ))}
                    </div>

                </div>
            </div>

        </main>
    );
}