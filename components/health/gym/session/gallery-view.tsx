"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Images, Share2, Trash2, X, Loader2, Dumbbell, Timer, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadGallery, clearGallery } from "./gym-gallery";
import { getWorkoutPhotos, saveWorkoutPhotos, deleteWorkoutPhoto, type SerializedWorkoutPhoto } from "@/app/(dashboard)/health/actions";
import { shareWorkoutCard } from "./gym-share";

// As fotos agora vivem NO BANCO (sincronizam entre aparelhos). Tipo único usado na UI.
type Photo = SerializedWorkoutPhoto;

function dayLabel(iso: string): string {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}

// Um "treino" = fotos que compartilham o mesmo instante de início + título (vêm da
// mesma sessão ao vivo). Agrupar assim deixa as várias fotos do dia organizadas em
// vez de soltas, e habilita o carrossel/lightbox por treino.
interface PhotoSession {
  key: string;
  date: string;
  title: string;
  volume: number | null;
  durationMin: number | null;
  sets: number | null;
  photos: Photo[];
}

export function GymGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sharing, setSharing] = useState(false);

  // "Drena" o IndexedDB → banco a cada abertura (auto-curável): cobre tanto a
  // migração das fotos antigas quanto qualquer foto que tenha caído no fallback
  // local por estar offline ao salvar. Depois carrega do banco (fonte sincronizável).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const local = await loadGallery();
        if (local.length > 0) {
          const res = await saveWorkoutPhotos(
            local.map((p) => ({
              dataUrl: p.dataUrl, title: p.title, date: p.date,
              volume: p.volume ?? null, durationMin: p.durationMin ?? null, sets: p.sets ?? null,
            })),
          );
          if (res.success) {
            await clearGallery();
            if (alive && (res.saved ?? 0) > 0) toast.success(`${res.saved} foto(s) sincronizada(s) para a nuvem.`);
          }
        }
      } catch {
        /* best-effort — não bloqueia o carregamento */
      }
      const db = await getWorkoutPhotos();
      if (alive) { setPhotos(db); setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const reload = () => { getWorkoutPhotos().then((db) => setPhotos(db)); };

  // Sessões (treinos) ordenadas do mais recente ao mais antigo.
  const sessions = useMemo(() => {
    const map = new Map<string, PhotoSession>();
    for (const p of photos) {
      const key = `${p.date}|${p.title}`;
      const ex = map.get(key);
      if (ex) ex.photos.push(p);
      else map.set(key, { key, date: p.date, title: p.title, volume: p.volume, durationMin: p.durationMin, sets: p.sets, photos: [p] });
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [photos]);

  // Sessões agrupadas por dia (cabeçalho de data).
  const days = useMemo(() => {
    const map = new Map<string, PhotoSession[]>();
    for (const s of sessions) {
      const k = s.date.slice(0, 10);
      const list = map.get(k);
      if (list) list.push(s); else map.set(k, [s]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sessions]);

  const activeSession = activeKey ? sessions.find((s) => s.key === activeKey) ?? null : null;
  const safeIndex = activeSession ? Math.min(activeIndex, activeSession.photos.length - 1) : 0;
  const activePhoto = activeSession ? activeSession.photos[safeIndex] : null;

  const open = (key: string, index: number) => { setActiveKey(key); setActiveIndex(index); };
  const close = () => setActiveKey(null);
  const go = (delta: number) => {
    if (!activeSession) return;
    const n = activeSession.photos.length;
    setActiveIndex((i) => (Math.min(i, n - 1) + delta + n) % n);
  };

  // Teclado no lightbox: ←/→ navega, Esc fecha.
  useEffect(() => {
    if (!activeKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, activeSession?.photos.length]);

  const remove = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id)); // otimista
    deleteWorkoutPhoto(id).then((res) => {
      if (res.success) { toast.success("Foto removida."); reload(); }
      else { toast.error(res.message); reload(); }
    });
  };

  const share = async (p: Photo) => {
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
    <div className="space-y-7">
      {days.map(([key, list]) => (
        <section key={key} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">{dayLabel(key)}</h3>
          {/* Grid no desktop: sem ele, um card de foto única ocupava a largura
              inteira do conteúdo e a imagem ficava gigante. */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <SessionCard key={s.key} session={s} onOpen={(idx) => open(s.key, idx)} />
            ))}
          </div>
        </section>
      ))}

      {/* Lightbox com carrossel por treino */}
      <AnimatePresence>
        {activeSession && activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={close}
          >
            <div className="flex items-center justify-between p-3">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 tabular-nums">
                {safeIndex + 1} / {activeSession.photos.length}
              </span>
              <button type="button" onClick={close} aria-label="Fechar" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
              {activeSession.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Foto anterior"
                  className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={activePhoto.id}
                  src={activePhoto.dataUrl}
                  alt={activePhoto.title}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="max-h-[68vh] max-w-full rounded-2xl object-contain"
                />
              </AnimatePresence>

              {activeSession.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Próxima foto"
                  className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            <div className="space-y-3 p-4" onClick={(e) => e.stopPropagation()}>
              {/* Dots de navegação (só quando há mais de uma foto) */}
              {activeSession.photos.length > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                  {activeSession.photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Ir para foto ${i + 1}`}
                      className={cnDot(i === safeIndex)}
                    />
                  ))}
                </div>
              )}

              <div className="text-center text-white">
                <p className="text-base font-bold">{activeSession.title}</p>
                <div className="mt-1 flex items-center justify-center gap-4 text-xs text-white/70">
                  {activeSession.durationMin != null && <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {activeSession.durationMin}min</span>}
                  {activeSession.sets != null && <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {activeSession.sets} séries</span>}
                  {activeSession.volume != null && <span className="inline-flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" /> {(activeSession.volume / 1000).toFixed(1)}k kg</span>}
                </div>
              </div>
              <div className="mx-auto flex max-w-sm gap-2">
                <Button onClick={() => share(activePhoto)} disabled={sharing} className="h-11 flex-1 gap-1.5">
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
                </Button>
                <Button variant="outline" onClick={() => remove(activePhoto.id)} className="h-11 gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Card de um treino: cabeçalho com stats + foto grande (1) ou carrossel (várias).
function SessionCard({ session, onOpen }: { session: PhotoSession; onOpen: (index: number) => void }) {
  const multiple = session.photos.length > 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card p-2.5 shadow-sm transition-colors hover:border-primary/30">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{session.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{timeLabel(session.date)}</span>
            {session.durationMin != null && <span>· {session.durationMin}min</span>}
            {session.sets != null && <span>· {session.sets} séries</span>}
            {session.volume != null && <span>· {(session.volume / 1000).toFixed(1)}k kg</span>}
          </div>
        </div>
        {multiple && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Images className="h-3 w-3" /> {session.photos.length} fotos
          </span>
        )}
      </div>

      {multiple ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {session.photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative h-44 w-32 shrink-0 snap-start overflow-hidden rounded-xl border border-border/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
              <img src={p.dataUrl} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
          <img src={session.photos[0].dataUrl} alt={session.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        </button>
      )}
    </div>
  );
}

// Estilo dos dots do lightbox (ativo = barra clara mais larga).
function cnDot(active: boolean): string {
  return active
    ? "h-1.5 w-5 rounded-full bg-white transition-all"
    : "h-1.5 w-1.5 rounded-full bg-white/40 transition-all hover:bg-white/70";
}
