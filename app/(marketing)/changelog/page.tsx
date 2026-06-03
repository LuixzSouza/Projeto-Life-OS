import type { Metadata } from "next";
import { GitCommit, Sparkles } from "lucide-react";
import { DocHeader } from "@/components/marketing/doc";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Histórico de versões e novidades do Life OS.",
};

interface Release {
  version: string;
  date: string;
  tag?: string;
  highlight?: boolean;
  items: string[];
}

const RELEASES: Release[] = [
  {
    version: "1.0.0",
    date: "Junho 2026",
    tag: "Stable",
    highlight: true,
    items: [
      "Landing page totalmente themeable (claro/escuro) com accent dinâmico sorteado a cada visita.",
      "Bento “Ecossistema Completo” reescrito fiel ao sistema: 16 módulos reais, incluindo Vagas e Negócios.",
      "Navbar com scroll-spy e páginas institucionais (privacidade, termos, contato, changelog).",
    ],
  },
  {
    version: "0.9.0",
    date: "Maio 2026",
    items: [
      "Setup local guiado com comandos prontos para copiar.",
      "Banco em produção: perfis local|cloud (Turso/libSQL) com o mesmo schema Prisma.",
      "Assistente de IA híbrido (Ollama local + OpenAI/Groq/Gemini) com loop agêntico nos módulos.",
    ],
  },
  {
    version: "0.8.0",
    date: "Abril 2026",
    items: [
      "Módulo Negócios: clientes, contratos (Billing) e faturas (Invoice) com central de cobrança via PIX.",
      "Cofre de Acessos com criptografia (keyring multi-chave).",
      "Agenda unificada: todo modelo datado aparece no calendário.",
    ],
  },
  {
    version: "0.7.0",
    date: "Março 2026",
    items: [
      "Saúde 360°: treino, corrida, nutrição, sono e medidas corporais.",
      "Estudos com flashcards (repetição espaçada / Leitner) e sessões de foco.",
      "Sistema de PDF para currículo/portfólio.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article>
      <DocHeader
        icon={GitCommit}
        eyebrow="Changelog"
        title="Novidades e versões"
        description="O que mudou no Life OS, da versão mais recente às anteriores."
      />

      <div className="relative space-y-8 border-l border-border/60 pl-8">
        {RELEASES.map((rel) => (
          <div key={rel.version} className="relative">
            {/* nó na trilha */}
            <span className="absolute -left-[39px] top-1 grid size-5 place-items-center rounded-full border border-primary/30 bg-background">
              <span className="size-2 rounded-full bg-primary" />
            </span>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold text-foreground">v{rel.version}</span>
              {rel.tag && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {rel.highlight && <Sparkles className="size-2.5" />} {rel.tag}
                </span>
              )}
              <span className="font-mono text-xs text-muted-foreground">{rel.date}</span>
            </div>

            <ul className="space-y-2">
              {rel.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}
