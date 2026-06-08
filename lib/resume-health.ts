// Heurísticas de "força" do currículo — dicas acionáveis além do % de completude.
// Puro (sem DOM), reaproveitável e fácil de testar.
import type { PortfolioData } from "@/types/portfolio";

export interface ResumeTip {
  id: string;
  label: string;
  done: boolean;
}

export function resumeHealth(d: PortfolioData): ResumeTip[] {
  const hasContact = !!(
    d.hero.email &&
    d.hero.phone &&
    d.hero.location &&
    (d.hero.website || d.hero.socials.linkedin || d.hero.socials.github)
  );

  const summaryLen = d.about.short.trim().length;
  const summaryOk = summaryLen >= 120 && summaryLen <= 450;

  // Conquista "quantificada": contém número, % ou métrica — sinal de impacto real.
  const quantified = d.experience.some((e) => e.achievements.some((a) => /\d/.test(a)));

  const expHasStack = d.experience.length === 0 || d.experience.every((e) => e.stack.length > 0);
  const projImpact = d.projects.length === 0 || d.projects.every((p) => p.impact.trim().length > 0);
  const techCount = d.skills.languages.length + d.skills.frameworks.length + d.skills.tools.length;

  return [
    { id: "contact", label: "Contato completo (e-mail, telefone, local e um link)", done: hasContact },
    { id: "summary", label: "Resumo estratégico entre 120 e 450 caracteres", done: summaryOk },
    { id: "quantified", label: "Ao menos uma conquista com número/métrica", done: quantified },
    { id: "stack", label: "Toda experiência com tech stack informada", done: expHasStack },
    { id: "impact", label: "Todo projeto com o impacto preenchido", done: projImpact },
    { id: "skills", label: "5+ habilidades técnicas cadastradas", done: techCount >= 5 },
  ];
}

/** Pontuação 0–100 da força (proporção de boas práticas atendidas). */
export function resumeHealthScore(tips: ResumeTip[]): number {
  if (tips.length === 0) return 0;
  return Math.round((tips.filter((t) => t.done).length / tips.length) * 100);
}
