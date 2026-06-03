"use client";

import { useState, type ReactNode } from "react";
import { Plus, Minus, MessageCircle, Mail, Package, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

// --- 1. DADOS (com as imagens reais) ---

interface FAQItem {
  id: string;
  q: string;
  a: string;
  visual: ReactNode;
}

const REPO_URL = "https://github.com/LuixzSouza/Projeto-Life-OS";

const FAQS: FAQItem[] = [
  {
    id: "free",
    q: "O Life OS é grátis? Preciso de uma conta?",
    a: "Totalmente **Open Source (MIT)** e gratuito. Sem assinaturas, sem logins externos. A arquitetura Local-First garante que o sistema é seu para sempre.",
    visual: <Image src="/faqs/faq1.webp" alt="Dashboard Open Source" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" priority />,
  },
  {
    id: "data",
    q: "Onde meus dados ficam salvos?",
    a: "Em um arquivo **SQLite** (`life_os.db`) na sua máquina. Você pode copiar esse arquivo para um HD Externo ou Dropbox para fazer backup. Seus dados, suas regras.",
    visual: <Image src="/faqs/faq2.webp" alt="Arquivo SQLite Local" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
  {
    id: "ai",
    q: "Como funciona a IA Híbrida?",
    a: "Você escolhe: use **Ollama** para rodar modelos localmente (privacidade total) ou conecte sua API da **OpenAI/Groq** para máxima performance na nuvem.",
    visual: <Image src="/faqs/faq3.webp" alt="Seletor de IA Híbrida" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
  {
    id: "pwa",
    q: "Existe aplicativo para celular?",
    a: "É um **PWA (Progressive Web App)**. Acesse `localhost:3000` no celular, clique em 'Adicionar à Tela Inicial' e use como um app nativo, inclusive offline.",
    visual: <Image src="/faqs/faq4.webp" alt="Interface PWA Mobile" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
  {
    id: "sync",
    q: "O que é o 'Neural Sync'?",
    a: "É o motor que conecta os módulos. Se você dormiu pouco (Módulo Saúde), o sistema sugere adiar tarefas complexas (Módulo Projetos). Tudo automático.",
    visual: <Image src="/faqs/faq5.webp" alt="Motor Neural Sync" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
  {
    id: "clients",
    q: "Serve para gerenciar clientes?",
    a: "Sim. Com o Cofre de Senhas e o CMS integrados, você isola credenciais de clientes e gerencia múltiplos projetos profissionais com segurança.",
    visual: <Image src="/faqs/faq6.webp" alt="Gestão de Clientes e Cofre" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
  {
    id: "dev",
    q: "Preciso saber programar?",
    a: "Sim, atualmente requer Node.js, Git e Terminal. Estamos trabalhando em documentação detalhada para tornar a instalação acessível.",
    visual: <Image src="/faqs/faq7.webp" alt="Terminal de Instalação" fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />,
  },
];

// Converte a mini-marcação das respostas (**negrito** e `código`) em HTML real.
// Conteúdo é estático/confiável (não vem do usuário), então é seguro injetar.
function formatAnswer(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(
      /`(.+?)`/g,
      '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-primary">$1</code>'
    );
}

const pad = (n: number) => String(n + 1).padStart(2, "0");

// --- 2. COMPONENTE PRINCIPAL ---

export default function FAQSectionWithImages() {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const hasSelection = openIndex >= 0 && openIndex < FAQS.length;

  return (
    <section
      id="faq"
      className="relative overflow-hidden border-t border-border/60 px-6 py-24"
    >
      {/* fundo themeable (grade + glow no accent) */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <MessageCircle className="size-3" /> Transparência Total
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Perguntas Frequentes
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Arquitetura Local-First, privacidade e requisitos técnicos explicados.
          </p>
        </div>

        {/* Layout: esquerda (accordion) | direita (janela sticky) */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_450px]">
          {/* --- ESQUERDA: ACCORDION --- */}
          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-all duration-300",
                    isOpen
                      ? "border-primary/30 bg-card shadow-[0_0_20px_-5px_var(--color-primary)]"
                      : "border-border/60 bg-card/30 hover:border-primary/30"
                  )}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="group flex w-full items-center gap-4 p-5 text-left"
                  >
                    {/* índice */}
                    <span
                      className={cn(
                        "font-mono text-xs font-bold transition-colors",
                        isOpen ? "text-primary" : "text-muted-foreground/60"
                      )}
                    >
                      {pad(i)}
                    </span>

                    <span
                      className={cn(
                        "flex-1 pr-2 text-base font-medium leading-tight transition-colors",
                        isOpen
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.q}
                    </span>

                    <span
                      className={cn(
                        "shrink-0 rounded-full p-1 transition-all",
                        isOpen
                          ? "bg-primary text-primary-foreground"
                          : "-rotate-90 bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}
                    >
                      {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                    </span>
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
                        <div className="border-t border-border/60 p-5 pl-12 pt-4 text-sm leading-relaxed text-muted-foreground">
                          <div
                            dangerouslySetInnerHTML={{ __html: formatAnswer(item.a) }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Contato rápido */}
            <div className="flex flex-wrap gap-4 pt-6">
              <a
                href="mailto:luiz.antoniodesouza004@gmail.com"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Mail className="size-3.5" /> Reportar Bug
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Package className="size-3.5" /> Acessar GitHub
              </a>
            </div>
          </div>

          {/* --- DIREITA: JANELA DE APP STICKY --- */}
          <div className="sticky top-24 hidden h-[420px] lg:block">
            <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
              {/* Header da janela (chrome no accent) */}
              <div className="z-20 flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/60 px-4 backdrop-blur">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary/70" />
                  <span className="size-2.5 rounded-full bg-primary/40" />
                  <span className="size-2.5 rounded-full bg-primary/20" />
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <ImageIcon className="size-3" /> System Viewer
                  {hasSelection && (
                    <span className="text-primary">· #{pad(openIndex)}</span>
                  )}
                </div>
                <div className="w-8" />
              </div>

              {/* Container da imagem */}
              <div className="relative flex-1 overflow-hidden bg-background">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={openIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    {hasSelection ? (
                      <div className="relative h-full w-full bg-background">
                        {FAQS[openIndex].visual}
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                          <MessageCircle className="size-6" />
                        </div>
                        <p className="text-sm font-medium">Selecione uma pergunta</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Legenda dinâmica: liga a pergunta selecionada ao preview */}
                {hasSelection && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/80 to-transparent p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {pad(openIndex)}
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">
                        {FAQS[openIndex].q}
                      </span>
                    </div>
                  </div>
                )}

                {/* Borda interna sutil */}
                <div className="pointer-events-none absolute inset-0 rounded-b-2xl border border-border/60" />
              </div>
            </div>

            {/* Glow / reflexo abaixo da janela */}
            <div className="pointer-events-none absolute -bottom-6 left-10 right-10 h-10 rounded-full bg-primary/20 opacity-50 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
