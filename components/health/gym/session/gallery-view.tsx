"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images, Share2, Trash2, X, Loader2, Dumbbell, Timer, Layers, ChevronLeft, ChevronRight,
  Plus, GitCompareArrows, Download, Check, ImagePlus, Camera, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { loadGallery, clearGallery, compressToDataUrl } from "./gym-gallery";
import { getWorkoutPhotos, saveWorkoutPhotos, deleteWorkoutPhoto, type SerializedWorkoutPhoto } from "@/app/(dashboard)/health/actions";
import { shareWorkoutCard } from "./gym-share";
import { shareComparison } from "./compare-image";

// As fotos agora vivem NO BANCO (sincronizam entre aparelhos). Tipo único usado na UI.
type Photo = SerializedWorkoutPhoto;

// Poses sugeridas ao adicionar foto de progresso (viram o título → facilitam
// comparar "frente com frente" depois).
const POSE_TAGS = ["Progresso", "Frente", "Costas", "Lateral", "Pump"];

function dayLabel(iso: string): string {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
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

  // Filtro por marcador (título): ver só "Frente"/"Costas"… → comparação justa.
  const [filter, setFilter] = useState<string | null>(null);

  // Modo comparação (antes/depois): seleciona até 2 fotos.
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Adicionar foto de progresso avulsa.
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("Progresso");
  const [adding, setAdding] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

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

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  // Marcadores existentes (título → contagem), do mais frequente ao menos.
  const markers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of photos) counts.set(p.title, (counts.get(p.title) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [photos]);

  // Fotos visíveis conforme o filtro de marcador ativo.
  const visiblePhotos = useMemo(
    () => (filter ? photos.filter((p) => p.title === filter) : photos),
    [photos, filter],
  );

  // Sessões (treinos) ordenadas do mais recente ao mais antigo.
  const sessions = useMemo(() => {
    const map = new Map<string, PhotoSession>();
    for (const p of visiblePhotos) {
      const key = `${p.date}|${p.title}`;
      const ex = map.get(key);
      if (ex) ex.photos.push(p);
      else map.set(key, { key, date: p.date, title: p.title, volume: p.volume, durationMin: p.durationMin, sets: p.sets, photos: [p] });
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [visiblePhotos]);

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

  const firstDate = photos.length ? photos[photos.length - 1].date : null;

  // Localizador foto → (sessão, índice) para abrir o lightbox certo a partir de
  // qualquer lugar (grade, destaques).
  const photoLoc = useMemo(() => {
    const m = new Map<string, { key: string; idx: number }>();
    for (const s of sessions) s.photos.forEach((p, i) => m.set(p.id, { key: s.key, idx: i }));
    return m;
  }, [sessions]);

  // Destaques: a foto mais recente de cada marcador (pose) — "seu visual atual de
  // cada ângulo". Com um só marcador, mostra as mais recentes. Só sem filtro ativo.
  const highlights = useMemo<Photo[]>(() => {
    if (photos.length < 3) return [];
    if (markers.length >= 2) {
      const seen = new Set<string>();
      const out: Photo[] = [];
      for (const p of photos) { // já vem do mais recente ao mais antigo
        if (!seen.has(p.title)) { seen.add(p.title); out.push(p); }
      }
      return out.slice(0, 8);
    }
    return photos.slice(0, 6);
  }, [photos, markers]);

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
  // Abre (ou seleciona, no modo comparação) uma foto vinda de qualquer lista.
  const openPhoto = (p: Photo) => {
    if (compareMode) { toggleSelect(p.id); return; }
    const loc = photoLoc.get(p.id);
    if (loc) open(loc.key, loc.idx);
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

  const downloadPhoto = (p: Photo) => {
    const a = document.createElement("a");
    a.href = p.dataUrl;
    a.download = `${p.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "foto"}.jpg`;
    a.click();
  };

  // --- Comparação ---
  const toggleCompareMode = () => {
    setCompareMode((v) => !v);
    setSelected([]);
    setCompareOpen(false);
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = prev.length >= 2 ? [prev[1], id] : [...prev, id]; // FIFO: mantém a última + a nova
      if (next.length === 2) setCompareOpen(true);
      return next;
    });
  };
  const clearCompare = () => { setSelected([]); setCompareOpen(false); };
  // Evolução automática: pega a foto mais antiga e a mais recente do recorte visível
  // (respeita o filtro de marcador) e já abre a comparação — um toque só.
  const autoCompare = () => {
    if (visiblePhotos.length < 2) return;
    const newest = visiblePhotos[0];               // visiblePhotos vem date-desc
    const oldest = visiblePhotos[visiblePhotos.length - 1];
    setSelected([oldest.id, newest.id]);
    setCompareOpen(true);
  };
  const comparePair = selected.map((id) => byId.get(id)).filter((p): p is Photo => !!p);
  const shareCompare = async () => {
    if (comparePair.length !== 2) return;
    setComparing(true);
    const res = await shareComparison(
      { dataUrl: comparePair[0].dataUrl, date: comparePair[0].date, title: comparePair[0].title },
      { dataUrl: comparePair[1].dataUrl, date: comparePair[1].date, title: comparePair[1].title },
    );
    setComparing(false);
    if (res === "downloaded") toast.success("Comparação salva no dispositivo!");
    else if (res === "failed") toast.error("Não foi possível gerar a comparação.");
  };

  // --- Adicionar foto ---
  const onAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAdding(true);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, 6).map((f) => compressToDataUrl(f, 1280, 0.82)));
      const now = new Date().toISOString();
      const title = addTitle.trim() || "Progresso";
      const res = await saveWorkoutPhotos(urls.map((dataUrl) => ({ dataUrl, title, date: now, volume: null, durationMin: null, sets: null })));
      if (res.success) {
        toast.success(`${res.saved ?? urls.length} foto(s) adicionada(s)! 📸`);
        setAddOpen(false);
        reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Não consegui processar a(s) imagem(ns).");
    } finally {
      setAdding(false);
      if (addInputRef.current) addInputRef.current.value = "";
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando galeria…
      </div>
    );
  }

  const selectedSet = new Set(selected);

  return (
    <div className="space-y-5">
      {/* Barra de ações da galeria */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-bold"><Images className="h-5 w-5 text-primary" /> Galeria de evolução</h3>
          {photos.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {photos.length} foto{photos.length > 1 ? "s" : ""} · {sessions.length} registro{sessions.length > 1 ? "s" : ""}
              {firstDate && ` · desde ${shortDate(firstDate)}`}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Registre sua evolução física ao longo do tempo.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {photos.length >= 2 && (
            <Button
              onClick={toggleCompareMode}
              size="sm"
              variant={compareMode ? "default" : "outline"}
              className="h-9 flex-1 gap-1.5 text-xs sm:flex-none"
            >
              <GitCompareArrows className="h-4 w-4" /> {compareMode ? "Sair" : "Comparar"}
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} size="sm" className="h-9 flex-1 gap-1.5 font-semibold text-xs sm:flex-none">
            <Plus className="h-4 w-4" /> Adicionar foto
          </Button>
        </div>
      </div>

      {/* Filtro por marcador (aparece quando há mais de um tipo de foto) */}
      {markers.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-3 h-7 text-xs font-medium transition-colors",
              filter === null ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            Todas
          </button>
          {markers.map(([title, count]) => (
            <button
              key={title}
              type="button"
              onClick={() => setFilter((f) => (f === title ? null : title))}
              className={cn(
                "shrink-0 rounded-full px-3 h-7 text-xs font-medium whitespace-nowrap transition-colors",
                filter === title ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {title} <span className="ml-1 opacity-60 font-mono text-[10px]">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Evolução automática do marcador filtrado (antes × depois num toque) */}
      {filter && visiblePhotos.length >= 2 && (
        <button
          type="button"
          onClick={autoCompare}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:from-primary/15 hover:to-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          Ver evolução de {filter} — primeira × última ({visiblePhotos.length} fotos)
        </button>
      )}

      {/* Dica do modo comparação */}
      {compareMode && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium text-primary">
            {selected.length === 0 ? "Toque em 2 fotos para comparar a evolução." : `${selected.length}/2 selecionada${selected.length > 1 ? "s" : ""}.`}
          </span>
          {selected.length > 0 && (
            <button type="button" onClick={clearCompare} className="font-semibold text-muted-foreground hover:text-foreground">Limpar</button>
          )}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/5 py-16 text-center">
          <div className="rounded-full bg-muted/30 p-3"><ImagePlus className="h-7 w-7 text-muted-foreground/50" /></div>
          <div>
            <h3 className="text-base font-semibold">Sua galeria de treinos</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Adicione fotos de progresso (frente, costas, perfil) ou finalize um treino ao vivo com foto. Depois compare a evolução lado a lado.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 gap-1.5"><Plus className="h-4 w-4" /> Adicionar primeira foto</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Destaques: seu visual mais recente de cada pose (só sem filtro) */}
          {!filter && highlights.length >= 3 && (
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Destaques
              </h3>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {highlights.map((p) => (
                  <button
                    key={`hl-${p.id}`}
                    type="button"
                    onClick={() => openPhoto(p)}
                    className="group relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-2xl border border-border/40 shadow-sm transition-all hover:border-primary/40 hover:shadow-md sm:w-36"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
                    <img src={p.dataUrl} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6 text-left">
                      <span className="block text-xs font-bold text-white">{p.title}</span>
                      <span className="block text-[10px] text-white/70">{shortDate(p.date)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {days.map(([key, list]) => {
            // Achata as sessões do dia numa grade única de miniaturas (estilo feed):
            // muito melhor que cards enormes empilhados. Cada miniatura lembra a qual
            // sessão/índice pertence para abrir o lightbox certo.
            const entries = list.flatMap((s) => s.photos.map((p, idx) => ({ p, key: s.key, idx, multi: s.photos.length > 1 })));
            return (
              <section key={key} className="space-y-2.5">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">
                  {dayLabel(key)}
                  <span className="font-mono text-[10px] normal-case opacity-50">· {entries.length}</span>
                </h3>
                <div className="grid grid-flow-dense grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {entries.map(({ p, key: sk, idx, multi }, i) => {
                    // Mosaico: a 1ª foto do dia vira destaque 2×2 quando há fotos
                    // suficientes para preencher ao redor (senão fica um bloco solto).
                    const featured = i === 0 && entries.length >= 4;
                    return (
                      <PhotoThumb
                        key={p.id}
                        photo={p}
                        multi={multi}
                        compareMode={compareMode}
                        selected={selectedSet.has(p.id)}
                        onClick={() => (compareMode ? toggleSelect(p.id) : open(sk, idx))}
                        className={cn("aspect-square", featured && "col-span-2 row-span-2")}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Modal de comparação antes/depois */}
      <AnimatePresence>
        {compareOpen && comparePair.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-white"><GitCompareArrows className="h-4 w-4" /> Evolução</span>
              <button type="button" onClick={() => setCompareOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden">
              {[...comparePair].sort((a, b) => (a.date < b.date ? -1 : 1)).map((p, i) => (
                <div key={p.id} className="flex min-h-0 flex-col">
                  <span className={cn("mb-2 self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white", i === 0 ? "bg-white/20" : "bg-primary")}>
                    {i === 0 ? "ANTES" : "DEPOIS"}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
                  <img src={p.dataUrl} alt={p.title} className="min-h-0 flex-1 rounded-xl object-contain" />
                  <span className="mt-2 text-center text-xs font-medium text-white/80">{shortDate(p.date)}</span>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-3 flex w-full max-w-sm gap-2">
              <Button onClick={shareCompare} disabled={comparing} className="h-11 flex-1 gap-1.5">
                {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
              </Button>
              <Button variant="outline" onClick={clearCompare} className="h-11 gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10">
                Trocar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adicionar foto de progresso */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddTitle("Progresso"); }}>
        <DialogContent size="sm">
          <DialogHeader icon={<Camera />} title="Adicionar foto" description="Registre uma foto de progresso — some à sua linha do tempo de evolução." />
          <DialogBody className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Marcador (vira o título)</p>
              <div className="flex flex-wrap gap-1.5">
                {POSE_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddTitle(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      addTitle === t ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => addInputRef.current?.click()}
              disabled={adding}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <div className="rounded-full bg-primary/10 p-3 text-primary"><ImagePlus className="h-6 w-6" /></div>}
              <span className="text-sm font-semibold">{adding ? "Salvando…" : "Tirar foto ou escolher"}</span>
              <span className="text-xs text-muted-foreground">Até 6 fotos · marcador &quot;{addTitle}&quot;</span>
            </button>
            <input ref={addInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onAddFiles(e.target.files)} />
          </DialogBody>
        </DialogContent>
      </Dialog>

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
                <Button variant="outline" onClick={() => downloadPhoto(activePhoto)} className="h-11 gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10" title="Baixar foto">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => remove(activePhoto.id)} className="h-11 gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Miniatura clicável (grade estilo feed) com estado de seleção (modo comparação)
// e indicador discreto de "várias fotos" quando faz parte de uma sessão com mais.
function PhotoThumb({ photo, compareMode, selected, multi = false, onClick, className }: {
  photo: Photo;
  compareMode: boolean;
  selected: boolean;
  multi?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative block overflow-hidden rounded-lg border transition-all",
        selected ? "border-primary ring-2 ring-primary" : "border-border/40 hover:border-primary/40",
        className,
      )}
      title={`${photo.title} · ${timeLabel(photo.date)}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
      <img src={photo.dataUrl} alt={photo.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
      {/* Título sutil no rodapé (aparece no hover) */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {photo.title}
      </span>
      {multi && !compareMode && (
        <span className="absolute right-1 top-1 rounded-md bg-black/45 p-0.5 text-white" title="Faz parte de uma sessão com várias fotos">
          <Layers className="h-3 w-3" />
        </span>
      )}
      {compareMode && (
        <span className={cn(
          "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-white/80 bg-black/30",
        )}>
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
      )}
    </button>
  );
}

// Estilo dos dots do lightbox (ativo = barra clara mais larga).
function cnDot(active: boolean): string {
  return active
    ? "h-1.5 w-5 rounded-full bg-white transition-all"
    : "h-1.5 w-1.5 rounded-full bg-white/40 transition-all hover:bg-white/70";
}
