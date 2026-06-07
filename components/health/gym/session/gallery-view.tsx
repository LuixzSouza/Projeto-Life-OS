"use client";

import { useEffect, useMemo, useState } from "react";
import { Images, Share2, Trash2, X, Loader2, Dumbbell, Timer, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadGallery, removeGalleryPhoto, type GalleryPhoto } from "./gym-gallery";
import { shareWorkoutCard } from "./gym-share";

function dayLabel(iso: string): string {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

export function GymGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<GalleryPhoto | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGallery().then((g) => { if (alive) { setPhotos(g); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    for (const p of photos) {
      const key = p.date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(p); else map.set(key, [p]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [photos]);

  const remove = (id: string) => {
    setActive(null);
    removeGalleryPhoto(id).then((g) => { setPhotos(g); toast.success("Foto removida."); });
  };

  const share = async (p: GalleryPhoto) => {
    setSharing(true);
    const res = await shareWorkoutCard({
      title: p.title,
      dateLabel: new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      volume: p.volume ?? 0,
      durationMin: p.durationMin ?? 0,
      sets: p.sets ?? 0,
      photoDataUrl: p.dataUrl,
    });
    setSharing(false);
    if (res === "downloaded") toast.success("Card salvo no dispositivo — é só enviar!");
    else if (res === "failed") toast.error("Não foi possível compartilhar.");
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando galeria…
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/5 py-20 text-center">
        <div className="rounded-full bg-muted/30 p-3"><Images className="h-7 w-7 text-muted-foreground/50" /></div>
        <div>
          <h3 className="text-base font-semibold">Sua galeria de treinos</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Ao finalizar um treino ao vivo, adicione fotos do dia. Elas aparecem aqui pra você acompanhar a evolução.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([key, list]) => (
        <section key={key} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">{dayLabel(key)}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {list.map((p) => (
              <button key={p.id} type="button" onClick={() => setActive(p)} className="group relative aspect-square overflow-hidden rounded-xl border border-border/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
                <img src={p.dataUrl} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white">{p.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Lightbox */}
      {active && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="flex items-center justify-end p-3">
            <button type="button" onClick={() => setActive(null)} aria-label="Fechar" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
            <img src={active.dataUrl} alt={active.title} className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
          </div>
          <div className="space-y-3 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-white">
              <p className="text-base font-bold">{active.title}</p>
              <div className="mt-1 flex items-center justify-center gap-4 text-xs text-white/70">
                {active.durationMin != null && <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {active.durationMin}min</span>}
                {active.sets != null && <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {active.sets} séries</span>}
                {active.volume != null && <span className="inline-flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" /> {(active.volume / 1000).toFixed(1)}k kg</span>}
              </div>
            </div>
            <div className="mx-auto flex max-w-sm gap-2">
              <Button onClick={() => share(active)} disabled={sharing} className="h-11 flex-1 gap-1.5">
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
              </Button>
              <Button variant="outline" onClick={() => remove(active.id)} className="h-11 gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
