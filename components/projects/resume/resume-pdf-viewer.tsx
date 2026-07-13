"use client";

// Prévia FIEL do currículo: renderiza o PDF REAL (@react-pdf/renderer) na tela,
// via usePDF → blob → <iframe>. O que se vê aqui é byte-a-byte o arquivo baixado.
//
// Otimizações:
//  - Carregado por `next/dynamic({ ssr:false })` no editor → a lib pesada do
//    react-pdf só entra no bundle quando a prévia é exibida.
//  - `data` é DEBOUNCED (700ms): digitar não re-renderiza o PDF a cada tecla.
//  - Mantém o último PDF visível enquanto o novo é gerado (sem flicker branco).
//
// Visualização (barra de ferramentas própria, sem trocar o motor):
//  - Ajuste "Largura"/"Página" + ZOOM real (−/％/＋) via parâmetros do leitor
//    embutido (#view / #zoom) — só muda o hash, NÃO regenera o blob.
//  - Download do arquivo exato mostrado e modo TELA CHEIA (overlay) para ler
//    confortável em telas estreitas.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePDF } from "@react-pdf/renderer";
import {
  Loader2, FileWarning, Maximize2, Minimize2, StretchHorizontal,
  Scan, ZoomIn, ZoomOut, Download,
} from "lucide-react";
import { ResumePdf } from "@/components/pdf/resume-pdf";
import { cn } from "@/lib/utils";
import type { PortfolioData } from "@/types/portfolio";

interface ResumePdfViewerProps {
  data: PortfolioData;
  locale?: string;
  template?: string;
  /** Nome do arquivo ao baixar direto da prévia. */
  name?: string;
}

// 'fit-width' encaixa a largura; 'fit-page' mostra a folha inteira; número = zoom %.
type Zoom = "fit-width" | "fit-page" | number;

const ZOOM_STEPS = [50, 75, 90, 100, 110, 125, 150, 175, 200];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Parâmetro de hash do leitor de PDF embutido para o zoom atual.
function zoomParam(zoom: Zoom): string {
  if (zoom === "fit-width") return "view=FitH";
  if (zoom === "fit-page") return "view=Fit";
  return `zoom=${zoom}`;
}

// Escala numérica efetiva (fits contam como 100% para o passo do +/−).
function effectivePct(zoom: Zoom): number {
  return typeof zoom === "number" ? zoom : 100;
}

function stepZoom(zoom: Zoom, dir: 1 | -1): number {
  const cur = effectivePct(zoom);
  if (dir === 1) return ZOOM_STEPS.find((s) => s > cur) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < cur) ?? MIN_ZOOM;
}

// Barra de ferramentas — reutilizada no painel e no modo tela cheia.
function Toolbar({
  zoom, setZoom, dense,
}: {
  zoom: Zoom;
  setZoom: (z: Zoom) => void;
  dense?: boolean;
}) {
  const pct = effectivePct(zoom);
  const segBtn = (active: boolean) =>
    cn(
      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    );
  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-1.5">
      {/* Ajuste largura / página */}
      <div className="flex items-center gap-0.5 rounded-xl bg-muted/50 p-0.5 ring-1 ring-border/40">
        <button type="button" onClick={() => setZoom("fit-width")} aria-pressed={zoom === "fit-width"} title="Ajustar à largura" className={segBtn(zoom === "fit-width")}>
          <StretchHorizontal className="h-3 w-3" /> {!dense && "Largura"}
        </button>
        <button type="button" onClick={() => setZoom("fit-page")} aria-pressed={zoom === "fit-page"} title="Ver a folha inteira" className={segBtn(zoom === "fit-page")}>
          <Scan className="h-3 w-3" /> {!dense && "Página"}
        </button>
      </div>

      {/* Zoom real */}
      <div className="flex items-center gap-0.5 rounded-xl bg-muted/50 p-0.5 ring-1 ring-border/40">
        <button type="button" onClick={() => setZoom(stepZoom(zoom, -1))} disabled={typeof zoom === "number" && zoom <= MIN_ZOOM} title="Diminuir zoom" aria-label="Diminuir zoom" className={iconBtn}>
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(100)}
          title="Zoom 100%"
          className="min-w-[3rem] rounded-lg px-1 py-1 text-center text-[10px] font-bold tabular-nums text-foreground transition-colors hover:bg-muted"
        >
          {typeof zoom === "number" ? `${pct}%` : "Ajuste"}
        </button>
        <button type="button" onClick={() => setZoom(stepZoom(zoom, 1))} disabled={typeof zoom === "number" && zoom >= MAX_ZOOM} title="Aumentar zoom" aria-label="Aumentar zoom" className={iconBtn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ResumePdfViewer({ data, locale, template, name }: ResumePdfViewerProps) {
  const debounced = useDebounced(data, 700);
  const [instance, update] = usePDF({
    document: <ResumePdf data={debounced} locale={locale} template={template} />,
  });

  const [zoom, setZoom] = useState<Zoom>("fit-width");
  const [fullscreen, setFullscreen] = useState(false);

  // Re-renderiza quando os dados (já debounced), idioma ou template mudam.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    update(<ResumePdf data={debounced} locale={locale} template={template} />);
  }, [debounced, locale, template, update]);

  // Esc fecha a tela cheia.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const url = instance.url;
  const src = url ? `${url}#toolbar=0&navpanes=0&${zoomParam(zoom)}` : "";
  const fileName = useMemo(
    () => `curriculo-${(name || data.hero.name || "export").replace(/\s+/g, "_").toLowerCase()}.pdf`,
    [name, data.hero.name]
  );

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

  const iconAction =
    "flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {/* BARRA DE FERRAMENTAS */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/80 px-2 py-1.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="hidden pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 sm:inline">
            Prévia fiel
          </span>
          {url && <Toolbar zoom={zoom} setZoom={setZoom} />}
        </div>
        <div className="flex items-center gap-1">
          {url && (
            <a href={url} download={fileName} title="Baixar este PDF" className={iconAction}>
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Baixar</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            disabled={!url}
            title="Abrir em tela cheia"
            aria-label="Abrir prévia em tela cheia"
            className={iconAction}
          >
            <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tela cheia</span>
          </button>
        </div>
      </div>

      {/* FOLHA (iframe do PDF real) */}
      <div className="relative min-h-0 flex-1">
        {src ? (
          <iframe
            // key no parâmetro de zoom: o leitor de PDF embutido só aplica
            // #view/#zoom no CARREGAMENTO. Remontar (key) recarrega o blob já com
            // o novo parâmetro. Não keyamos no blob → edições continuam suaves.
            key={zoomParam(zoom)}
            title="Prévia do currículo (PDF real)"
            src={src}
            className="h-full w-full rounded-xl border border-border/40 bg-white shadow-sm"
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

      {/* TELA CHEIA — leitura confortável, independente da largura do painel. */}
      {fullscreen && url && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Prévia do currículo
            </span>
            <div className="flex items-center gap-2">
              <Toolbar zoom={zoom} setZoom={setZoom} />
              <a href={url} download={fileName} title="Baixar este PDF" className={iconAction}>
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Baixar</span>
              </a>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                title="Fechar tela cheia (Esc)"
                aria-label="Fechar tela cheia"
                className="flex h-8 items-center gap-1.5 rounded-full bg-muted/60 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Minimize2 className="h-3.5 w-3.5" /> Fechar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-zinc-100/60 p-3 dark:bg-zinc-900/40 sm:p-6">
            <iframe
              key={`fs-${zoomParam(zoom)}`}
              title="Prévia do currículo em tela cheia"
              src={src}
              className="mx-auto h-full w-full max-w-5xl rounded-xl border border-border/40 bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
