"use client";

// Exporta a Retrospectiva (mês ou ano) em PDF — mesmo padrão do cardápio
// semanal: lazy-load do react-pdf só quando o usuário clica.

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MonthStats } from "@/components/review/review-types";
import type { TrendPoint } from "@/components/review/finance-trend-chart";

interface ExportReviewPdfButtonProps {
  periodLabel: string;
  prevLabel: string;
  fileSlug: string; // ex.: "2026-06" ou "2026"
  currency: string;
  stats: MonthStats;
  prev: MonthStats;
  trend: TrendPoint[];
}

export function ExportReviewPdfButton(props: ExportReviewPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const generatedAt = new Date().toLocaleString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      const [{ pdf: renderPdf }, { ReviewDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/review-document"),
      ]);

      const blob = await renderPdf(
        <ReviewDocument
          periodLabel={props.periodLabel}
          prevLabel={props.prevLabel}
          generatedAt={generatedAt}
          currency={props.currency}
          stats={props.stats}
          prev={props.prev}
          trend={props.trend}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `retrospectiva-${props.fileSlug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      toast.success("PDF da retrospectiva gerado! 📄");
    } catch (error) {
      console.error("Erro ao gerar PDF da retrospectiva:", error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="gap-1.5 rounded-lg">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{loading ? "Gerando…" : "Exportar PDF"}</span>
    </Button>
  );
}
