// Smoke visual dos PDFs da marca: renderiza documentos de amostra em logs/
// para inspecionar o design sem precisar abrir o app.
// Uso: npx tsx scripts/pdf-smoke.tsx
import React from "react";
import { mkdirSync } from "node:fs";
import { renderToFile } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { BillingDocument } from "../components/pdf/billing-document";
import { MeetingDocument } from "../components/pdf/meeting-document";
import { ResumePdf } from "../components/pdf/resume-pdf";
import { LUIZ_PORTFOLIO } from "../components/projects/resume/seed-data";
import type { PortfolioData } from "../types/portfolio";
import { buildPixPayload } from "../lib/pix-payload";

mkdirSync("logs", { recursive: true });

const pixPayload = buildPixPayload({
  key: "luiz.antoniodesouza003@gmail.com",
  merchantName: "LuixzSouza Desenvolvimento",
  amount: 5000,
});

const billing = async () => (
  <BillingDocument
    billingTitle="Desenvolvimento do E-commerce"
    clientName="Maria Fernanda"
    clientCompany="Studio MF"
    clientDocument="12.345.678/0001-90"
    businessName="LuixzSouza · Desenvolvimento Web"
    pixKey="luiz.antoniodesouza003@gmail.com"
    pixPayload={pixPayload}
    pixQrDataUrl={await QRCode.toDataURL(pixPayload, { margin: 1, width: 320, errorCorrectionLevel: "M" })}
    generatedAt="11 de junho de 2026, 16:45"
    totals={{ total: "R$ 7.500,00", paid: "R$ 2.500,00", open: "R$ 5.000,00" }}
    invoices={[
      { label: "Parcela 1/3 — Entrada", value: "R$ 2.500,00", due: "10/05/2026", statusLabel: "Paga", tone: "paid" },
      { label: "Parcela 2/3 — Homologação", value: "R$ 2.500,00", due: "10/06/2026", statusLabel: "Vencida", tone: "late" },
      { label: "Parcela 3/3 — Entrega final", value: "R$ 2.500,00", due: "10/07/2026", statusLabel: "Pendente", tone: "open" },
    ]}
    notes="Inclui hospedagem assistida por 30 dias após a entrega. Alterações de escopo são orçadas à parte."
  />
);

const meeting = (
  <MeetingDocument
    title="Kickoff — Redesign do site institucional"
    dateLabel="11 de junho de 2026"
    generatedAt="11 de junho de 2026, 16:45"
    notes={"Definimos o escopo da primeira fase do redesign.\nO cliente prefere um visual mais clean, com menos blocos de cor.\nPrazo de homologação combinado para a primeira quinzena de julho."}
    summary="Reunião de abertura do projeto de redesign. Escopo da fase 1 fechado (home + 3 páginas internas), visual clean aprovado por todos e cronograma validado com folga para homologação."
    actionItems={[
      "Enviar proposta revisada com o cronograma da fase 1",
      "Levantar referências visuais de concorrentes",
      "Agendar workshop de conteúdo com o time de marketing",
    ]}
    decisions={["Visual clean aprovado", "Homologação na 1ª quinzena de julho"]}
    images={[]}
    participants={["Luiz", "Maria Fernanda", "Pedro (Marketing)"]}
    tags={["redesign", "fase-1", "cliente-mf"]}
  />
);

// Currículo real (dados do seed) — verifica o template ATS no caso feliz.
const resume = <ResumePdf data={LUIZ_PORTFOLIO} locale="pt-BR" />;

// Teste de estresse fixo (roadmap §2): muitas experiências, bullets de ~500
// caracteres, título sem espaço e URL gigante — nada pode estourar ou cortar.
const HUGE_BULLET =
  "Liderei a reformulação completa da arquitetura de front-end migrando um monolito legado para uma stack moderna baseada em Next.js e React Server Components, reduzindo o tempo de carregamento inicial em 62%, eliminando 140 mil linhas de código morto, padronizando o design system em 38 componentes acessíveis e mentorando quatro pessoas desenvolvedoras juniores ao longo do processo de migração incremental sem downtime.";
const stress: PortfolioData = {
  ...LUIZ_PORTFOLIO,
  hero: {
    ...LUIZ_PORTFOLIO.hero,
    name: "SupercalifragilisticexpialidocioseAntidisestablishmentarianismo",
    website: "https://www.exemplo-com-um-dominio-absurdamente-longo-para-testar-quebra.com.br/caminho/muito/profundo?query=parametro-gigante",
  },
  experience: Array.from({ length: 12 }, (_, i) => ({
    id: `stress-${i}`,
    company: `Empresa Número ${i + 1} com Nome Institucional Bastante Extenso Ltda`,
    role: "Pessoa Desenvolvedora Front-End Sênior e Arquiteta de Interfaces",
    startDate: "jan 2020",
    endDate: i === 0 ? "atual" : "dez 2021",
    location: "São Paulo, SP · remoto",
    summary: HUGE_BULLET.slice(0, 200),
    achievements: [HUGE_BULLET, HUGE_BULLET.slice(0, 180)],
    stack: ["React", "Next.js", "TypeScript", "Tailwind", "Node.js"],
  })),
};
const resumeStress = <ResumePdf data={stress} locale="pt-BR" />;

async function main() {
  await renderToFile(await billing(), "logs/pdf-smoke-billing.pdf");
  await renderToFile(meeting, "logs/pdf-smoke-meeting.pdf");
  await renderToFile(resume, "logs/pdf-smoke-resume.pdf");
  await renderToFile(resumeStress, "logs/pdf-smoke-resume-stress.pdf");
  console.log("ok: logs/pdf-smoke-*.pdf (billing, meeting, resume, resume-stress)");
}

void main();
