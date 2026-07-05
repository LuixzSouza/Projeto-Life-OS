"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Minus,
  Cloud,
  HardDrive,
  Heart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Infinity as InfinityIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site.config";

/* ------------------------------------------------------------------ *
 *  PLANOS & EDIÇÕES
 *  Honesto ao produto: o Life OS é open source e local-first, então
 *  não vendemos "assinatura de software". A escada de valor vai do uso
 *  100% local (grátis pra sempre) até apoiar o projeto no GitHub.
 * ------------------------------------------------------------------ */

const SPONSOR_URL = siteConfig.urls.sponsor;
const REPO_URL = siteConfig.urls.repo;

interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  icon: ReactNode;
  tagline: string;
  /** Preço "à vista" (compromisso pontual) e "recorrente" (apoio mensal). */
  price: { commit: string; recurring: string };
  priceNote: string;
  cta: { label: string; href: string; external?: boolean; primary?: boolean };
  features: PlanFeature[];
  highlight?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: "local",
    name: "Local",
    icon: <HardDrive className="size-5" />,
    tagline: "Tudo roda na sua máquina. Pra sempre.",
    price: { commit: "R$0", recurring: "R$0" },
    priceNote: "Grátis, sem cartão, sem pegadinha",
    cta: { label: "Instalar agora", href: "/setup", primary: true },
    features: [
      { label: "16 módulos integrados", included: true },
      { label: "Banco SQLite portátil (100% seu)", included: true },
      { label: "PWA offline no celular", included: true },
      { label: "IA local via Ollama", included: true },
      { label: "Open source (MIT)", included: true },
      { label: "Sync entre dispositivos", included: false },
    ],
  },
  {
    id: "cloud",
    name: "Cloud Sync",
    icon: <Cloud className="size-5" />,
    tagline: "Acesse seus dados de qualquer lugar.",
    price: { commit: "R$0", recurring: "Grátis*" },
    priceNote: "*Você traz sua própria chave (Turso / OpenAI)",
    cta: { label: "Ver como ativar", href: "#config", primary: true },
    features: [
      { label: "Tudo do plano Local", included: true },
      { label: "Réplica na nuvem (Turso / libSQL)", included: true },
      { label: "Sync PC ↔ celular em tempo real", included: true },
      { label: "IA na nuvem (OpenAI / Groq / Gemini)", included: true },
      { label: "Backup automático completo", included: true },
      { label: "Feed iCal da agenda", included: true },
    ],
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "sponsor",
    name: "Apoiador",
    icon: <Heart className="size-5" />,
    tagline: "Ajude o projeto a crescer — e ganhe voz.",
    price: { commit: "Você decide", recurring: "R$15/mês" },
    priceNote: "Pague o que quiser via GitHub Sponsors",
    cta: { label: "Apoiar o projeto", href: SPONSOR_URL, external: true },
    features: [
      { label: "Tudo do Cloud Sync", included: true },
      { label: "Nome nos créditos do projeto", included: true },
      { label: "Voto no roadmap de features", included: true },
      { label: "Suporte prioritário por e-mail", included: true },
      { label: "Acesso antecipado a novidades", included: true },
      { label: "Aquele carinho de manter tudo grátis 💜", included: true },
    ],
  },
];

type BillingMode = "commit" | "recurring";

export default function PricingSection() {
  const [mode, setMode] = useState<BillingMode>("recurring");
  const reduceMotion = useReducedMotion();

  const modeLabel = useMemo(
    () => ({ commit: "Uma vez", recurring: "Mensal" }),
    []
  );

  // Respeita o flag de feature: some com o plano de apoio se desligado.
  const plans = useMemo(
    () => PLANS.filter((p) => p.id !== "sponsor" || siteConfig.features.showSponsorPlan),
    []
  );

  return (
    <section id="pricing" className="relative overflow-hidden px-4 py-24">
      {/* Fundo themeable */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* -------- Header -------- */}
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="size-3" /> Planos & Edições
          </span>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Comece de graça.{" "}
            <span className="text-gradient-brand">Escale quando quiser.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            O Life OS é seu para sempre — sem mensalidade obrigatória. Você só paga
            se quiser apoiar quem constrói.
          </p>
        </div>

        {/* -------- Toggle de modo de apoio -------- */}
        <div className="mb-14 flex items-center justify-center">
          <div
            role="tablist"
            aria-label="Modo de contribuição"
            className="relative inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1 backdrop-blur-sm"
          >
            {(["recurring", "commit"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(m)}
                  className={cn(
                    "relative rounded-full px-5 py-1.5 text-xs font-bold transition-colors",
                    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="pricing-mode-pill"
                      className="absolute inset-0 rounded-full bg-primary shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{modeLabel[m]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------- Cards -------- */}
        <div className={cn(
          "grid grid-cols-1 gap-6 lg:items-stretch",
          plans.length === 3 ? "lg:grid-cols-3" : "mx-auto max-w-4xl lg:grid-cols-2"
        )}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "landing-card group relative flex flex-col rounded-3xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1",
                plan.highlight
                  ? "border-primary/40 shadow-[0_0_60px_-25px_var(--color-primary)] lg:-my-3 lg:scale-[1.03]"
                  : "hover:border-primary/30"
              )}
            >
              {/* Badge de destaque */}
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-md">
                  {plan.badge}
                </span>
              )}

              {/* Linha brilhante no topo (destaque) */}
              {plan.highlight && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
              )}

              {/* Cabeçalho do plano */}
              <div className="mb-5">
                <div
                  className={cn(
                    "mb-4 inline-flex size-11 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110",
                    plan.highlight
                      ? "bg-primary text-primary-foreground ring-primary/30"
                      : "bg-primary/10 text-primary ring-primary/20"
                  )}
                >
                  {plan.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              </div>

              {/* Preço */}
              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <motion.span
                    key={plan.price[mode]}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-4xl font-bold tracking-tight text-gradient-brand"
                  >
                    {plan.price[mode]}
                  </motion.span>
                  {plan.id === "local" && (
                    <span className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <InfinityIcon className="size-3.5" /> pra sempre
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {plan.priceNote}
                </p>
              </div>

              {/* Features */}
              <ul className="mb-7 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      "flex items-start gap-2.5 text-sm",
                      f.included ? "text-foreground" : "text-muted-foreground/60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                        f.included
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground/50"
                      )}
                    >
                      {f.included ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : (
                        <Minus className="size-3" strokeWidth={3} />
                      )}
                    </span>
                    <span className={cn(!f.included && "line-through decoration-muted-foreground/40")}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                {plan.cta.primary ? (
                  <Link
                    href={plan.cta.href}
                    className="group/cta relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-[0_0_35px_-8px_var(--color-primary)] active:scale-95"
                  >
                    {/* faixa de luz varrendo no hover (eco do CtaButton do hero) */}
                    <span
                      aria-hidden
                      className="absolute inset-0 -translate-x-[150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[150%]"
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      {plan.cta.label}
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
                    </span>
                  </Link>
                ) : plan.cta.external ? (
                  <a
                    href={plan.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-6 text-base font-bold text-primary transition-all hover:bg-primary/10 hover:shadow-[0_0_30px_-10px_var(--color-primary)] active:scale-95"
                  >
                    <Heart className="size-4" /> {plan.cta.label}
                  </a>
                ) : (
                  <Link
                    href={plan.cta.href}
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-border px-6 text-base font-bold text-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
                  >
                    {plan.cta.label}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* -------- Selo de confiança -------- */}
        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" /> Sem vendor lock-in
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <HardDrive className="size-4 text-primary" /> Seus dados, seu arquivo
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Sparkles className="size-4 text-primary" /> Código 100% aberto
          </a>
        </div>
      </div>
    </section>
  );
}
