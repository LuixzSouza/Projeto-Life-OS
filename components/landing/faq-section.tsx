// components/landing/faq-section.tsx
"use client";

import { useState } from "react";
import { Plus, Minus, MessageCircle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const FAQS = [
  { 
    q: "Onde meus dados financeiros e pessoais ficam salvos?", 
    a: "Sua privacidade é inegociável. O Life OS utiliza uma arquitetura 'Local-First' com banco de dados SQLite. Isso significa que seus dados vivem fisicamente no seu dispositivo (ou no seu servidor pessoal), criptografados, e nunca são vendidos ou acessados por terceiros." 
  },
  { 
    q: "Preciso pagar para usar as IAs (GPT/Claude)?", 
    a: "Não necessariamente. O sistema é híbrido: você pode conectar suas chaves de API (OpenAI/Anthropic) se quiser o máximo de inteligência, OU pode rodar modelos locais gratuitos (como Llama 3) via Ollama, sem custo nenhum e totalmente offline." 
  },
  { 
    q: "O sistema funciona no celular (iOS/Android)?", 
    a: "Sim. O Life OS é um PWA (Progressive Web App). Você pode instalá-lo diretamente pelo navegador do seu celular. Ele se comporta como um aplicativo nativo, com ícone na home, suporte a gestos e modo offline." 
  },
  { 
    q: "Consigo importar dados de outros apps (Notion/Excel)?", 
    a: "Sim. Temos ferramentas de migração para CSV e JSON. Se você já tem uma planilha de finanças ou um banco de dados no Notion, pode importar tudo para não começar do zero." 
  },
  { 
    q: "Como funciona a automação entre módulos?", 
    a: "O 'Neural Sync' roda em segundo plano. Por exemplo: se você marcar no módulo de Saúde que dormiu mal, o módulo de Agenda sugere automaticamente reagendar tarefas complexas para outro dia. Tudo configurável nas Configurações." 
  },
  { 
    q: "Preciso saber programar para instalar?", 
    a: "Não. Oferecemos um instalador desktop simples (.exe/.dmg) para uso local. Para usuários avançados, também disponibilizamos a imagem Docker para rodar em servidores próprios (Self-Hosted)." 
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Primeiro item aberto por padrão

  return (
    <section className="py-24 px-6 bg-[#09090b] border-t border-white/5 relative overflow-hidden">
      
      {/* Background Glow sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Dúvidas Frequentes</h2>
          <p className="text-zinc-400">Tudo o que você precisa saber sobre a arquitetura e uso do Life OS.</p>
        </div>
        
        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div 
                key={i} 
                className={cn(
                    "border rounded-2xl overflow-hidden transition-all duration-300",
                    isOpen ? "bg-zinc-900/50 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]" : "bg-zinc-900/20 border-white/5 hover:border-white/10"
                )}
              >
                <button 
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors"
                >
                  <span className={cn("font-medium text-lg", isOpen ? "text-white" : "text-zinc-400")}>
                    {item.q}
                  </span>
                  <div className={cn(
                      "p-1 rounded-full transition-colors",
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
                      <div className="p-5 pt-0 text-base text-zinc-400 leading-relaxed border-t border-white/5 mt-2">
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
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Ainda tem dúvidas?</h3>
            <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                Se você não encontrou a resposta acima, entre em contato direto com o desenvolvedor. Estamos aqui para ajudar.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a 
                    href="mailto:luiz.anttoniodesouza004@gmail.com" 
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
                >
                    <Mail className="h-4 w-4" /> Enviar E-mail
                </a>
                <a 
                    href="#" 
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold border border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                    <MessageCircle className="h-4 w-4" /> Discord da Comunidade
                </a>
            </div>
        </div>

      </div>
    </section>
  );
}