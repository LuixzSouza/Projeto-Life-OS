"use client";

import { useState, ReactNode } from "react";
import { 
  Plus, Minus, MessageCircle, Mail, Package, 
  ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

// --- 1. DADOS (Com as imagens reais) ---

interface FAQItem {
    id: string;
    q: string;
    a: string;
    visual: ReactNode; 
}

const FAQS: FAQItem[] = [
  { 
    id: "free",
    q: "O Life OS é grátis? Preciso de uma conta?", 
    a: "Totalmente **Open Source (MIT)** e gratuito. Sem assinaturas, sem logins externos. A arquitetura Local-First garante que o sistema é seu para sempre.",
    // Use 'sizes' para otimização responsiva
    visual: <Image src="/faqs/faq1.webp" alt="Dashboard Open Source" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" priority />
  },
  { 
    id: "data",
    q: "Onde meus dados ficam salvos?", 
    a: "Em um arquivo **SQLite** (`life_os.db`) na sua máquina. Você pode copiar esse arquivo para um HD Externo ou Dropbox para fazer backup. Seus dados, suas regras.",
    visual: <Image src="/faqs/faq2.webp" alt="Arquivo SQLite Local" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
  { 
    id: "ai",
    q: "Como funciona a IA Híbrida?", 
    a: "Você escolhe: use **Ollama** para rodar modelos localmente (privacidade total) ou conecte sua API da **OpenAI/Groq** para máxima performance na nuvem.",
    visual: <Image src="/faqs/faq3.webp" alt="Seletor de IA Híbrida" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
  { 
    id: "pwa",
    q: "Existe aplicativo para celular?", 
    a: "É um **PWA (Progressive Web App)**. Acesse `localhost:3000` no celular, clique em 'Adicionar à Tela Inicial' e use como um app nativo, inclusive offline.",
    visual: <Image src="/faqs/faq4.webp" alt="Interface PWA Mobile" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
  { 
    id: "sync",
    q: "O que é o 'Neural Sync'?", 
    a: "É o motor que conecta os módulos. Se você dormiu pouco (Módulo Saúde), o sistema sugere adiar tarefas complexas (Módulo Projetos). Tudo automático.",
    visual: <Image src="/faqs/faq5.webp" alt="Motor Neural Sync" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
  { 
    id: "clients",
    q: "Serve para gerenciar clientes?", 
    a: "Sim. Com o Cofre de Senhas e o CMS integrados, você isola credenciais de clientes e gerencia múltiplos projetos profissionais com segurança.",
    visual: <Image src="/faqs/faq6.webp" alt="Gestão de Clientes e Cofre" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
  { 
    id: "dev",
    q: "Preciso saber programar?", 
    a: "Sim, atualmente requer Node.js, Git e Terminal. Estamos trabalhando em documentação detalhada para tornar a instalação acessível.",
    visual: <Image src="/faqs/faq7.webp" alt="Terminal de Instalação" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
  },
];

// --- 2. COMPONENTE PRINCIPAL ---

export default function FAQSectionWithImages() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="py-24 px-6 bg-[#09090b] border-t border-white/5 relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute right-0 top-1/4 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">
            <MessageCircle className="h-3 w-3 text-indigo-400" /> Transparência Total
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Perguntas Frequentes</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Arquitetura Local-First, privacidade e requisitos técnicos explicados.
          </p>
        </div>

        {/* Layout Grid: Esquerda (Texto) | Direita (Imagem Sticky) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-10 items-center">

          {/* --- ESQUERDA: LISTA DE PERGUNTAS (ACCORDION) --- */}
          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-all duration-300",
                    isOpen
                      ? "bg-zinc-900 border-indigo-500/30 shadow-[0_0_20px_-5px_rgba(99,102,241,0.1)]"
                      : "bg-zinc-900/30 border-white/5 hover:border-white/10"
                  )}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between p-5 text-left transition-colors group"
                  >
                    <span className={cn("font-medium text-base pr-4 leading-tight", isOpen ? "text-white" : "text-zinc-400 group-hover:text-zinc-300")}>
                      {item.q}
                    </span>
                    <div className={cn(
                      "p-1 rounded-full transition-all shrink-0",
                      isOpen ? "bg-indigo-500 text-white rotate-0" : "bg-zinc-800 text-zinc-500 -rotate-90"
                    )}>
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 pt-0 text-sm text-zinc-400 leading-relaxed border-t border-white/5">
                            <div dangerouslySetInnerHTML={{ __html: item.a }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            
            {/* Bloco de Contato Rápido */}
            <div className="pt-6 flex gap-3 flex-wrap">
                 <a href="mailto:luiz.anttoniodesouza004@gmail.com" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                    <Mail className="h-3 w-3" /> Reportar Bug
                 </a>
                 <a href="#" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                    <Package className="h-3 w-3" /> Acessar GitHub
                 </a>
            </div>
          </div>

          {/* --- DIREITA: ÁREA VISUAL (JANELA DE APP STICKY) --- */}
          <div className="hidden lg:block sticky top-24 h-[420px]">
            <div className="w-full h-full rounded-2xl bg-[#0F0F10] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative group">
                
                {/* Header da Janela (Estilo Mac/Browser) */}
                <div className="h-10 bg-zinc-900/90 backdrop-blur border-b border-white/5 flex items-center px-4 gap-2 shrink-0 justify-between z-20">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> System Viewer
                    </div>
                    <div className="w-8" />
                </div>

                {/* Container da Imagem */}
                <div className="flex-1 relative overflow-hidden bg-zinc-950">
                    <AnimatePresence mode="wait">
                        <motion.div
                            // A chave muda baseada no index, forçando a re-renderização e animação
                            key={openIndex} 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} // Curva de animação suave
                            className="absolute inset-0"
                        >
                            {/* Renderiza a imagem ou um estado vazio */}
                            {openIndex >= 0 && openIndex < FAQS.length 
                                ? (
                                    // Usando 'fill' e 'object-cover' para a imagem preencher o container
                                    <div className="w-full h-full relative bg-black">
                                        {FAQS[openIndex].visual}
                                    </div>
                                )
                                : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-3">
                                        <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center">
                                            <MessageCircle className="h-6 w-6 opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium">Selecione uma pergunta</p>
                                    </div>
                                )
                            }
                        </motion.div>
                    </AnimatePresence>
                    
                    {/* Borda interna sutil para acabamento */}
                    <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-b-2xl" />
                </div>

            </div>
            
            {/* Glow / Reflexo abaixo da janela */}
            <div className="absolute -bottom-6 left-10 right-10 h-10 bg-indigo-500/20 blur-2xl rounded-full opacity-50" />
          </div>

        </div>

      </div>
    </section>
  );
}