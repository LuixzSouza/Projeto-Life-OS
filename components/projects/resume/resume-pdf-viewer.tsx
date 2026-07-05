"use client";

// Prévia FIEL do currículo: renderiza o PDF REAL (@react-pdf/renderer) na tela,
// via usePDF → blob → <iframe>. O que se vê aqui é byte-a-byte o arquivo baixado.
//
// Otimizações:
//  - Este componente é carregado por `next/dynamic({ ssr:false })` no editor, então
//    a lib pesada do react-pdf só entra no bundle quando a prévia é exibida.
//  - `data` é DEBOUNCED (700ms): digitar no formulário não re-renderiza o PDF a
//    cada tecla — só após a pausa.
//  - Mantém o último PDF renderizado visível enquanto o novo é gerado (sem flicker
//    de tela branca); um selo discreto indica "atualizando".

import { useEffect, useRef, useState } from "react";
import { usePDF } from "@react-pdf/renderer";
import { Loader2, FileWarning } from "lucide-react";
import { ResumePdf } from "@/components/pdf/resume-pdf";
import type { PortfolioData } from "@/types/portfolio";

interface ResumePdfViewerProps {
  data: PortfolioData;
  locale?: string;
  template?: string;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ResumePdfViewer({ data, locale, template }: ResumePdfViewerProps) {
  const debounced = useDebounced(data, 700);
  const [instance, update] = usePDF({
    document: <ResumePdf data={debounced} locale={locale} template={template} />,
  });

  // Re-renderiza quando os dados (já debounced), idioma ou template mudam.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    update(<ResumePdf data={debounced} locale={locale} template={template} />);
  }, [debounced, locale, template, update]);

  // O usePDF MANTÉM a url anterior durante a regeneração (só liga `loading`) e só
  // troca o blob quando o novo está pronto — então usar `instance.url` direto já é
  // livre de flicker, sem precisar de cache manual.
  const url = instance.url;

  if (instance.error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 p-6 text-center">
        <FileWarning className="h-8 w-8 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">Não foi possível renderizar a prévia</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          O download em PDF continua funcionando normalmente pelo botão “Exportar PDF”.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {url ? (
        <iframe
          title="Prévia do currículo (PDF real)"
          // #toolbar=0: sem a barra do leitor; FitH: encaixa a largura da folha.
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          className="h-full w-full rounded-xl border border-border/40 bg-white shadow-inner"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Gerando prévia em PDF…
          </p>
        </div>
      )}

      {/* Selo "atualizando" — só quando há um PDF antigo visível sendo trocado. */}
      {instance.loading && url && (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-md backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin text-primary" /> Atualizando
        </div>
      )}
    </div>
  );
}
