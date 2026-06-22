"use client";

// Editor do dono (Sheet lateral): personalizar o TEXTO da homenagem e gerenciar
// as FOTOS da celebração (suas e da pessoa). Tudo persiste via Attachment
// (entityType="celebration") e reflete na hora no palco e no link compartilhado.

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Save, RotateCcw, ImagePlus, X, Loader2, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compress";
import {
  getCelebrationEditData,
  saveCelebrationMessage,
  clearCelebrationMessage,
  regenerateCelebration,
  addCelebrationPhoto,
  removeCelebrationPhoto,
  type CelebrationPhoto,
  type CelebrationSource,
} from "@/app/(dashboard)/social/celebration-actions";

interface Suggestion { label: string; src: string }

export function CelebrationEditor({
  friendId,
  open,
  onOpenChange,
  onMessageSaved,
  onPhotosChanged,
}: {
  friendId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSaved: (paragraphs: string[], source: CelebrationSource) => void;
  onPhotosChanged: (allPhotos: string[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [hasCustom, setHasCustom] = useState(false);
  const [photos, setPhotos] = useState<CelebrationPhoto[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busyPhoto, startPhoto] = useTransition();
  const [busyText, startText] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega os dados sempre que abrir. Sem setState síncrono no corpo do efeito
  // (regra react-hooks/set-state-in-effect): tudo acontece no callback assíncrono.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getCelebrationEditData(friendId)
      .then((d) => {
        if (!alive || !d) return;
        setText(d.message);
        setHasCustom(d.hasCustom);
        setPhotos(d.photos);
        setSuggestions(d.suggestions);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, friendId]);

  const applyPhotoUpdate = (res: { photos: CelebrationPhoto[]; allPhotos: string[] } | null) => {
    if (!res) { toast.error("Não consegui atualizar as fotos."); return; }
    setPhotos(res.photos);
    onPhotosChanged(res.allPhotos);
  };

  const onSave = () =>
    startText(async () => {
      const res = await saveCelebrationMessage(friendId, text);
      if (res) {
        setHasCustom(res.source === "custom");
        onMessageSaved(res.paragraphs, res.source);
        toast.success("Texto salvo 💛");
      } else toast.error("Não consegui salvar.");
    });

  const onAuto = () =>
    startText(async () => {
      const res = await clearCelebrationMessage(friendId);
      if (res) {
        setText(res.paragraphs.join("\n\n"));
        setHasCustom(false);
        onMessageSaved(res.paragraphs, res.source);
        toast.success("Voltou ao texto automático.");
      }
    });

  const onAi = () =>
    startText(async () => {
      const res = await regenerateCelebration(friendId);
      if (res) {
        setText(res.paragraphs.join("\n\n"));
        toast.success(res.source === "ai" ? "Sugestão da IA ✨ (revise e salve)" : "Sugestão montada (revise e salve)");
      } else toast.error("Não consegui gerar agora.");
    });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    startPhoto(async () => {
      try {
        const dataUrl = await compressImage(file, { maxDim: 1400, quality: 0.72 });
        applyPhotoUpdate(await addCelebrationPhoto(friendId, dataUrl));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao adicionar a foto.");
      }
    });
  };

  const onAddSuggestion = (src: string) =>
    startPhoto(async () => {
      try {
        applyPhotoUpdate(await addCelebrationPhoto(friendId, src));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao adicionar.");
      }
    });

  const onRemove = (id: string) =>
    startPhoto(async () => {
      applyPhotoUpdate(await removeCelebrationPhoto(friendId, id));
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/40 px-5 py-4 text-left">
          <SheetTitle className="text-base font-bold">Personalizar celebração</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-5 py-5">
            {/* MENSAGEM */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensagem</label>
                {hasCustom && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">personalizada</span>
                )}
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Escreva uma homenagem do seu jeito… (uma linha em branco separa os parágrafos)"
                className="resize-none text-sm leading-relaxed"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={onSave} disabled={busyText} className="rounded-full">
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar texto
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onAi} disabled={busyText} className="rounded-full">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Gerar com IA
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onAuto} disabled={busyText} className="rounded-full text-muted-foreground">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Automático
                </Button>
              </div>
            </section>

            {/* FOTOS */}
            <section className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fotos {busyPhoto && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
              </label>

              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {photos.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL / imagem externa */}
                      <img src={p.src} alt="Foto da celebração" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        disabled={busyPhoto}
                        aria-label="Remover foto"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-rose-500 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Botão de upload */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busyPhoto}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Adicionar</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s.src}
                      type="button"
                      onClick={() => onAddSuggestion(s.src)}
                      disabled={busyPhoto}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" /> {s.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                As fotos aparecem no carrossel do alto da página — suas e da pessoa, do jeito que quiser.
              </p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
