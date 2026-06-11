// Smoke visual dos PDFs da marca: renderiza documentos de amostra em logs/
// para inspecionar o design sem precisar abrir o app.
// Uso: npx tsx scripts/pdf-smoke.tsx
import React from "react";
import { mkdirSync } from "node:fs";
import { renderToFile } from "@react-pdf/renderer";
import { BillingDocument } from "../components/pdf/billing-document";
import { MeetingDocument } from "../components/pdf/meeting-document";

mkdirSync("logs", { recursive: true });

const billing = (
  <BillingDocument
    billingTitle="Desenvolvimento do E-commerce"
    clientName="Maria Fernanda"
    clientCompany="Studio MF"
    clientDocument="12.345.678/0001-90"
    businessName="LuixzSouza · Desenvolvimento Web"
    pixKey="luiz.antoniodesouza003@gmail.com"
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

async function main() {
  await renderToFile(billing, "logs/pdf-smoke-billing.pdf");
  await renderToFile(meeting, "logs/pdf-smoke-meeting.pdf");
  console.log("ok: logs/pdf-smoke-billing.pdf e logs/pdf-smoke-meeting.pdf");
}

void main();
