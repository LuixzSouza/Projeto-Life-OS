// components/landing/faq-section.tsx
"use client";

import { useState } from "react";
import { Plus, Minus, MessageCircle, Mail, Database, BrainCircuit, Smartphone, Package, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const FAQS = [
  { 
    q: "O Life OS é grátis? Preciso de uma conta na nuvem?", 
    a: "O projeto é totalmente Open Source e **gratuito**. Não é necessário criar contas externas ou pagar assinaturas. A arquitetura 'Local-First' garante que você rode o sistema 100% no seu computador, com privacidade total e sem depender de servidores de terceiros." 
  },
  { 
    q: "Onde meus dados financeiros e de projetos são armazenados?", 
    a: "Seus dados são salvos em um arquivo **SQLite** (`.db`) no seu dispositivo. Você tem controle total sobre este arquivo e pode movê-lo para um HD Externo ou pasta sincronizada (Google Drive/Dropbox) diretamente pela área de Configurações, garantindo portabilidade e backup sem a nossa intervenção." 
  },
  { 
    q: "Como funciona a Inteligência Artificial Híbrida?", 
    a: "O sistema suporta duas vias: 1) **Local e Gratuita:** Integre com o Ollama para rodar modelos como Llama 3 no seu PC (privacidade máxima). 2) **Nuvem e Performance:** Conecte suas próprias chaves de API (OpenAI, Groq, Google) para usar modelos de alta performance. Você decide o balanço entre privacidade e poder de processamento." 
  },
  { 
    q: "Preciso baixar um aplicativo na App Store ou Play Store?", 
    a: "Não. O Life OS foi desenvolvido como um PWA (Progressive Web App). Você o acessa pelo navegador (`localhost:3000`) e pode adicioná-lo à tela inicial do seu celular (iOS/Android). Ele funciona como um app nativo, com ícone próprio e capacidade de rodar offline." 
  },
  { 
    q: "O que é o 'Neural Sync' que automatiza os módulos?", 
    a: "O Neural Sync é o motor de contextualização interno. Ele usa a IA para analisar correlações entre seus módulos. Por exemplo, se você registrar um nível baixo de energia no módulo de Saúde, o sistema pode sugerir automaticamente mover tarefas de alta prioridade (do módulo de Projetos) para a agenda do dia seguinte." 
  },
  { 
    q: "O Life OS pode ser usado para gerenciar clientes (devs, freelancers)?", 
    a: "Sim. A seção **Cofre de Senhas** e os módulos de **Projetos** e **Gerenciamento de Sites (CMS)** foram desenhados para suportar fluxos profissionais. Você pode isolar credenciais de cliente e monitorar o status de diferentes projetos de forma organizada." 
  },
  { 
    q: "Eu preciso saber programar para instalar o Life OS?", 
    a: "Sim, para a versão atual. Como o projeto é Open Source e Self-Hosted (auto-hospedado), é necessário ter Node.js, Git e saber executar comandos básicos no Terminal. Estamos focando em documentação detalhada (o 'Guia de Setup' acima) para facilitar o processo para desenvolvedores e entusiastas." 
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Primeiro item aberto por padrão

  return (
    <section className="py-24 px-6 bg-[#09090b] border-t border-white/5 relative overflow-hidden">
      
      {/* Background Glow sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <MessageCircle className="h-3 w-3 text-indigo-400" /> Transparência Total
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Perguntas Frequentes</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">Tudo o que você precisa saber sobre a arquitetura Local-First, privacidade e requisitos de uso do Life OS.</p>
        </div>
        
        <div className="space-y-4">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div 
                key={i} 
                className={cn(
                    "border rounded-2xl overflow-hidden transition-all duration-300",
                    isOpen 
                        ? "bg-zinc-900 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.1)]" 
                        : "bg-zinc-900/50 border-white/10 hover:border-white/20"
                )}
              >
                <button 
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors"
                >
                  <span className={cn("font-semibold text-lg", isOpen ? "text-white" : "text-zinc-300")}>
                    {item.q}
                  </span>
                  <div className={cn(
                      "p-1 rounded-full transition-colors shrink-0",
                      isOpen ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </div>
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 text-base text-zinc-400 leading-relaxed border-t border-white/10">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* --- CARD DE CONTATO EXTRA --- */}
        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-indigo-500/20 text-center shadow-xl shadow-indigo-500/10">
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Pronto para assumir o controle?</h3>
            <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                Se você ainda tem dúvidas sobre contribuição, arquitetura ou quer reportar um bug, use os canais abaixo.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a 
                    href="mailto:luiz.anttoniodesouza004@gmail.com" 
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30"
                >
                    <Mail className="h-4 w-4" /> Contato Direto
                </a>
                <a 
                    href="#" 
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold border border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                    <Package className="h-4 w-4" /> Repositório (GitHub)
                </a>
            </div>
        </div>

      </div>
    </section>
  );
}