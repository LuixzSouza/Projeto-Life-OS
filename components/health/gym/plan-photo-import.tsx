"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, X, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogBody,
} from "@/components/ui/dialog";
import { compressToDataUrl } from "./session/gym-gallery";
import { importPlanFromPhoto } from "@/app/(dashboard)/health/actions/plan-vision";
import type { ImportedPlan } from "./session/plan-import-types";

// Importar ficha POR FOTO: o usuário fotografa a ficha que o personal mandou
// (impressa/print) e a IA de visão extrai divisões + exercícios + metas. As
// imagens são comprimidas no cliente (portabilidade/custo) e nunca salvas —
// só trafegam para a IA. O resultado abre no editor para revisão antes de salvar.

const MAX_PHOTOS = 4;

export function PlanPhotoImport({ onImported }: { onImported: (plan: ImportedPlan) => void }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]); // data URLs comprimidos
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPhotos([]); setBusy(false); };

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (chosen.length === 0) { toast.info(`Máximo de ${MAX_PHOTOS} fotos.`); return; }
    try {
      const urls = await Promise.all(chosen.map((f) => compressToDataUrl(f, 1400, 0.82)));
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      toast.error("Não consegui processar essa imagem.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (photos.length === 0) return;
    setBusy(true);
    try {
      const res = await importPlanFromPhoto(photos);
      if (res.success && res.plan) {
        toast.success(res.message);
        setOpen(false);
        reset();
        onImported(res.plan);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Falha ao analisar a foto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="h-9 flex-1 gap-1.5 text-xs sm:flex-none"
        title="Importar ficha a partir de uma foto"
      >
        <Camera className="h-3.5 w-3.5" /> Por foto
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent size="md">
          <DialogHeader
            icon={<Camera />}
            title="Importar ficha por foto"
            description="Fotografe a ficha que te passaram — a IA lê os exercícios e monta tudo."
          />
          <DialogBody className="custom-scrollbar space-y-4">
            {/* Grade de fotos escolhidas */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((src, i) => (
                  <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border/50 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Ficha ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Área de captura */}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
              >
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  {photos.length === 0 ? <ImagePlus className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                </div>
                <span className="text-sm font-semibold">
                  {photos.length === 0 ? "Tirar foto ou escolher imagem" : "Adicionar outra página"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Até {MAX_PHOTOS} fotos · uma por divisão/página
                </span>
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />

            <p className="flex items-start gap-1.5 rounded-lg bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Dica: enquadre a ficha bem iluminada, sem sombras. Depois de ler, você revisa e ajusta tudo antes de salvar.
            </p>

            <div className="flex gap-2">
              {photos.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhotos([])} disabled={busy} className="h-10 gap-1.5 text-muted-foreground">
                  <Trash2 className="h-4 w-4" /> Limpar
                </Button>
              )}
              <Button type="button" onClick={analyze} disabled={busy || photos.length === 0} className="h-10 flex-1 gap-2 font-semibold">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Lendo a ficha…</> : <><Sparkles className="h-4 w-4" /> Ler ficha com IA</>}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
