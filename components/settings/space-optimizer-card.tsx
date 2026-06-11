"use client";

// Otimizador de Espaço (Configurações → Manutenção): para quem está no plano
// grátis e quer o banco o MENOR possível. Duas frentes:
//  1. Recompressão de imagens base64 — roda AQUI no navegador (canvas →
//     JPEG ≤1024px q0.78), uma a uma, e só grava se ficar de fato menor.
//  2. Faxina seletiva — índice da IA (regenerável), logs antigos, versões de
//     nota além das 10 últimas, lixeira +30d, chats de IA +90d, notificações
//     lidas. Cada uma com checkbox; nada some sem você marcar.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getSpaceAnalysis,
  runSpaceCleanup,
  getImagePayload,
  saveOptimizedImage,
  type SpaceAnalysis,
  type CleanupKey,
} from "@/app/(dashboard)/settings/actions";
import { Shrink, ImageDown, Sparkles, BrushCleaning, Loader2, CheckCircle2 } from "lucide-react";

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

/** Redimensiona p/ ≤1024px e reencoda como JPEG q0.78 (fundo branco p/ PNG). */
async function recompress(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.fillStyle = "#ffffff"; // transparência de PNG vira fundo branco
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function SpaceOptimizerCard() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<SpaceAnalysis | null>(null);
  const [selected, setSelected] = useState<Set<CleanupKey>>(new Set());
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isCleaning, startCleaning] = useTransition();
  const [imgProgress, setImgProgress] = useState<{ done: number; total: number; saved: number } | null>(null);
  const [imgRunning, setImgRunning] = useState(false);

  const handleAnalyze = () => {
    startAnalyzing(async () => {
      try {
        const result = await getSpaceAnalysis();
        setAnalysis(result);
        // Pré-marca só o que é 100% seguro (regenerável/registro morto).
        setSelected(new Set<CleanupKey>(["embeddings", "logs90", "readNotifications", "backupLogs"]));
      } catch {
        toast.error("Não foi possível analisar o espaço.");
      }
    });
  };

  const toggle = (key: CleanupKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCleanup = () => {
    if (selected.size === 0) return toast.info("Marque ao menos uma faxina.");
    startCleaning(async () => {
      const res = await runSpaceCleanup([...selected]);
      if (res.success) {
        toast.success(res.message, { duration: 8000 });
        handleAnalyze();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleOptimizeImages = async () => {
    if (!analysis || analysis.optimizable.length === 0 || imgRunning) return;
    setImgRunning(true);
    const queue = analysis.optimizable;
    let saved = 0;
    let done = 0;
    setImgProgress({ done: 0, total: queue.length, saved: 0 });
    try {
      for (const item of queue) {
        try {
          const payload = await getImagePayload(item.kind, item.id);
          if (payload) {
            const smaller = await recompress(payload.dataUrl);
            // Só vale gravar se cair pelo menos 10% — senão é churn de sync à toa.
            if (smaller && smaller.length < payload.dataUrl.length * 0.9) {
              const res = await saveOptimizedImage(item.kind, item.id, smaller);
              if (res.success) saved += res.savedBytes;
            }
          }
        } catch {
          /* uma imagem corrompida não para a fila */
        }
        done++;
        setImgProgress({ done, total: queue.length, saved });
      }
      toast.success(
        saved > 0
          ? `Imagens otimizadas: ${fmt(saved)} liberados.`
          : "Imagens verificadas — já estavam compactas.",
        { duration: 8000 },
      );
      handleAnalyze();
      router.refresh();
    } finally {
      setImgRunning(false);
    }
  };

  const imagesTotal = analysis?.images.reduce((sum, g) => sum + g.bytes, 0) ?? 0;
  const optimizableBytes = analysis?.optimizable.reduce((sum, o) => sum + o.bytes, 0) ?? 0;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-background rounded-xl shadow-sm text-emerald-500 border border-emerald-500/20 shrink-0">
          <Shrink className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-foreground">Otimizar espaço</h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            Para o plano grátis render: recomprima as <strong>imagens</strong> (o que mais
            pesa — tarefas e contatos em texto ocupam quase nada) e faça a faxina do que é
            regenerável ou antigo. Nada é removido sem você marcar.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing || imgRunning}
          className="shrink-0 border-emerald-500/30 hover:bg-emerald-500/10"
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analysis ? "Reanalisar" : "Analisar espaço"}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          {/* IMAGENS */}
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <ImageDown className="h-3.5 w-3.5 text-emerald-500" />
                Imagens no banco · {fmt(imagesTotal)}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleOptimizeImages}
                disabled={imgRunning || analysis.optimizable.length === 0}
                className="h-8 bg-emerald-600 text-white hover:bg-emerald-600/90"
              >
                {imgRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />}
                {analysis.optimizable.length === 0
                  ? "Nada a comprimir"
                  : `Comprimir ${analysis.optimizable.length} (${fmt(optimizableBytes)})`}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {analysis.images
                .filter((g) => g.count > 0)
                .map((g) => (
                  <p key={g.kind} className="text-[11px] text-muted-foreground">
                    {g.label}: <span className="font-mono">{g.count} · {fmt(g.bytes)}</span>
                  </p>
                ))}
              {analysis.images.every((g) => g.count === 0) && (
                <p className="text-[11px] text-muted-foreground">Nenhuma imagem embutida no banco.</p>
              )}
            </div>
            {imgProgress && (
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(imgProgress.done / Math.max(1, imgProgress.total)) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {imgProgress.done}/{imgProgress.total} · {fmt(imgProgress.saved)} liberados
                </p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Reduz para no máx. 1024px (JPEG) e só grava se ficar pelo menos 10% menor.
              A qualidade visual em tela praticamente não muda.
            </p>
          </div>

          {/* FAXINAS */}
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <BrushCleaning className="h-3.5 w-3.5 text-emerald-500" /> Faxina seletiva
            </p>
            <div className="space-y-1.5">
              {analysis.cleanups.map((c) => (
                <label
                  key={c.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md border p-2 cursor-pointer transition-colors",
                    c.count === 0
                      ? "opacity-45 cursor-default border-transparent"
                      : selected.has(c.key)
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border/50 hover:bg-muted/40",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-emerald-600"
                    checked={selected.has(c.key) && c.count > 0}
                    disabled={c.count === 0 || isCleaning}
                    onChange={() => toggle(c.key)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {c.label}{" "}
                      <span className="font-mono text-muted-foreground">
                        · {c.count}{c.bytes > 0 ? ` · ${fmt(c.bytes)}` : ""}
                      </span>
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCleanup}
              disabled={isCleaning || imgRunning || selected.size === 0}
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-600/90"
            >
              {isCleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {isCleaning ? "Limpando..." : "Limpar selecionados"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
