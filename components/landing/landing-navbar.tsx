"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils"; 
import { Menu, X, ChevronRight, Command, LogIn, ArrowRight } from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
    authState: {
        isLoggedIn: boolean;
        isConfigured: boolean;
    };
}

export default function LandingNavbar({ authState }: NavbarProps) {
    const { isLoggedIn, isConfigured } = authState;
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Links de Navegação
    const navLinks = [
        { label: "Módulos", href: "#modules" },
        { label: "Inteligência", href: "#ai" },
        { label: "Privacidade", href: "#privacy" },
    ];

    // Lógica do Botão Principal (CTA)
    const targetUrl = isLoggedIn ? "/dashboard" : (isConfigured ? "/login" : "/setup");
    const buttonText = isLoggedIn ? "Abrir Dashboard" : (isConfigured ? "Entrar no Sistema" : "Instalar Life OS");
    const ButtonIcon = isLoggedIn ? ArrowRight : (isConfigured ? LogIn : Command);

    // 1. Detectar Scroll
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 2. Travar Scroll no Mobile
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
    }, [mobileMenuOpen]);

    return (
        <>
            <header 
                className={cn(
                    "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b",
                    scrolled 
                        ? "border-white/5 bg-[#050505]/80 backdrop-blur-xl h-16" 
                        : "border-transparent bg-transparent h-24"
                )}
            >
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    
                    {/* --- LOGO BRANDING --- */}
                    <Link href="/" className="flex items-center gap-3 group relative z-50">
                        <div className="h-10 w-10 bg-gradient-to-tr from-zinc-800 to-black border border-white/10 rounded-xl flex items-center justify-center shadow-2xl group-hover:border-white/20 transition-all">
                            <Command className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-base font-bold text-white leading-none tracking-tight">Life OS</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-zinc-500 font-mono leading-none uppercase tracking-wide">v1.0 Stable</span>
                            </div>
                        </div>
                    </Link>
                    
                    {/* --- DESKTOP NAVIGATION --- */}
                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/5 backdrop-blur-sm">
                            {navLinks.map((link) => (
                                <Link 
                                    key={link.href} 
                                    href={link.href} 
                                    className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        
                        <Link href={targetUrl}>
                            <Button 
                                className="bg-white text-black hover:bg-zinc-200 rounded-full h-10 px-6 text-xs font-bold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] gap-2"
                            >
                                {buttonText}
                                <ButtonIcon className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>

                    {/* --- MOBILE TOGGLE --- */}
                    <button 
                        className="md:hidden p-2 text-zinc-400 hover:text-white active:scale-95 transition-transform z-50 relative"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </header>

            {/* --- MOBILE MENU OVERLAY --- */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="fixed inset-0 z-40 bg-[#050505] pt-32 px-6 md:hidden flex flex-col justify-between pb-10"
                    >
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                        {/* Links */}
                        <nav className="flex flex-col gap-2 relative z-10">
                            {navLinks.map((link, idx) => (
                                <motion.div
                                    key={link.href}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + (idx * 0.05) }}
                                >
                                    <Link 
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="group flex items-center justify-between text-2xl font-bold text-zinc-400 py-4 border-b border-white/5 hover:text-white transition-colors"
                                    >
                                        <span className="group-hover:translate-x-2 transition-transform duration-300">{link.label}</span>
                                        <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>

                        {/* Footer do Menu Mobile */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative z-10 space-y-6"
                        >
                            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                    <Command className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold">Life OS Mobile</p>
                                    <p className="text-zinc-500 text-xs">Acesse de qualquer lugar.</p>
                                </div>
                            </div>

                            <Link href={targetUrl} onClick={() => setMobileMenuOpen(false)} className="block w-full">
                                <Button className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 text-lg rounded-2xl shadow-xl shadow-white/5">
                                    {buttonText}
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}