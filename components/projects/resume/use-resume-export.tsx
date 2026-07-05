"use client";

// Hook de exportação de currículo em PDF (Fase 2 do Career OS).
// Import dinâmico do react-pdf + template ATS: a lib pesada só entra no bundle
// quando o usuário clica em "Exportar PDF" (padrão da casa, ver [[pdf-system]]).

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { PortfolioData } from "@/types/portfolio";

export interface ResumeExportOptions {
  data: PortfolioData;
  /** Nome da versão — usado só para o nome do arquivo. */
  name?: string;
  locale?: string;
  template?: string;
}

function fileSlug(opts: ResumeExportOptions): string {
  const base = opts.data.hero.name || opts.name || "curriculo";
  return base.trim().replace(/\s+/g, "_").toLowerCase();
}

export function useResumeExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (opts: ResumeExportOptions) => {
    setExporting(true);
    try {
      const [{ pdf: renderPdf }, { ResumePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/resume-pdf"),
      ]);

      const blob = await renderPdf(
        <ResumePdf data={opts.data} locale={opts.locale} template={opts.template} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curriculo-${fileSlug(opts)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      toast.success("PDF do currículo gerado! 📄");
    } catch (error) {
      console.error("Erro ao gerar PDF do currículo:", error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportPdf };
}
