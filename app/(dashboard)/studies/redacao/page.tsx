// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { PenLine } from "lucide-react";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { RedacaoCorrector } from "@/components/studies/redacao-corrector";

export const metadata: Metadata = {
  title: "Redação ENEM | Life OS",
  description: "Escreva sua redação e receba a nota nas 5 competências do ENEM, corrigida por IA.",
};

export default function RedacaoPage() {
  return (
    <PageShell>
      <PageHeader
        icon={<PenLine className="h-6 w-6" />}
        title="Redação ENEM"
        description="Escreva, corrija por IA nas 5 competências (0–1000) e salve nas suas Notas."
        backHref="/studies"
        backLabel="Voltar para Estudos"
      />
      <PageContainer>
        <RedacaoCorrector />
      </PageContainer>
    </PageShell>
  );
}
