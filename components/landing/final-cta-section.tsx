"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Github, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaButton } from "./cta-button";
import { siteConfig } from "@/config/site.config";

interface FinalCTAProps {
  authState: {
    isLoggedIn: boolean;
    isConfigured: boolean;
  };
}

export default function FinalCTASection({ authState }: FinalCTAProps) {
  const { isLoggedIn, isConfigured } = authState;
  const targetUrl = isLoggedIn ? "/dashboard" : isConfigured ? "/login" : "/setup";
  const ctaLabel = isLoggedIn ? "Acessar Dashboard" : isConfigured ? "Entrar no Sistema" : "Começar Agora";
  const reduceMotion = useReducedMotion();

  return (
    <section id="start" className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="landing-card relative overflow-hidden rounded-3xl px-6 py-16 text-center shadow-2xl md:px-16"
        >
          {/* Aura/glow de fundo (decorativo — pausado em reduced-motion via CSS global) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[110px]" />
            <div className="absolute bottom-0 right-0 h-64 w-64 translate-y-1/3 rounded-full bg-primary/15 blur-[100px]" />
          </div>
          {/* Linha brilhante no topo do card */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

          <div className="relative z-10 mx-auto max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
              <Sparkles className="size-3.5" /> Pronto em menos de 2 minutos
            </span>

            <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Sua vida merece um sistema{" "}
              <span className="text-gradient-brand">
                só seu
              </span>
              .
            </h2>

            <p className="text-lg leading-relaxed text-muted-foreground">
              Comece grátis, sem cartão e sem nuvem obrigatória. Seus dados ficam num único
              arquivo que você controla — pode mover, copiar ou apagar quando quiser.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
              <CtaButton href={targetUrl}>{ctaLabel}</CtaButton>
              {siteConfig.features.showGithubLinks && siteConfig.urls.repo && (
                <a
                  href={siteConfig.urls.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="ghost"
                    className="h-14 w-full rounded-full border border-border px-8 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground sm:w-auto"
                  >
                    <Github className="mr-2 h-5 w-5" /> Ver no GitHub
                  </Button>
                </a>
              )}
            </div>

            <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-primary" />
              100% local · open source · privacidade por padrão
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
