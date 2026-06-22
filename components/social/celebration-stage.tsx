"use client";

// A "estrela do show": experiência de aniversário em tela cheia, animada e
// dinâmica por pessoa. Reusada na visão do dono (/social/celebrar/<id>) e na
// pública (/celebrar/<token>). Confetes, aurora ao fundo, fotos com brilho e a
// homenagem entrando em cascata. Tudo client-side com framer-motion.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Cake, ArrowLeft, Share2, Sparkles, Heart, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { CelebrationEditor } from "./celebration-editor";
import type { CelebrationData, CelebrationSource } from "@/app/(dashboard)/social/celebration-actions";

// ---------------------------------------------------------------------------
// Confetes — gerados uma vez por montagem (useMemo), com cores do tema.
// ---------------------------------------------------------------------------
interface ConfettiPiece {
  left: number; delay: number; duration: number; color: string;
  size: number; rotate: number; drift: number; round: boolean;
}

function makeConfetti(colors: string[], count: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 4,
      color: colors[i % colors.length],
      size: 7 + Math.random() * 9,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 120,
      round: Math.random() > 0.5,
    });
  }
  return pieces;
}

function ConfettiRain({ colors }: { colors: string[] }) {
  // Geração só no cliente (Math.random impuro / evita mismatch de hidratação).
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  useEffect(() => { setPieces(makeConfetti(colors, 44)); }, [colors]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
          }}
          initial={{ y: "-10vh", opacity: 0, rotate: p.rotate }}
          animate={{ y: "110vh", x: p.drift, opacity: [0, 1, 1, 0.9], rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fundo: aurora suave + emojis flutuando
// ---------------------------------------------------------------------------
interface Floater {
  emoji: string; left: number; delay: number; duration: number; size: number;
}

function makeFloaters(emojis: string[]): Floater[] {
  return Array.from({ length: 9 }, (_, i) => ({
    emoji: emojis[i % emojis.length],
    left: 6 + ((i * 11) % 88),
    delay: Math.random() * 5,
    duration: 7 + Math.random() * 6,
    size: 22 + Math.random() * 26,
  }));
}

function FloatingEmojis({ emojis }: { emojis: string[] }) {
  const [items, setItems] = useState<Floater[]>([]);
  useEffect(() => { setItems(makeFloaters(emojis)); }, [emojis]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((it, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 select-none opacity-25 dark:opacity-20"
          style={{ left: `${it.left}%`, fontSize: it.size }}
          initial={{ y: "10vh", opacity: 0 }}
          animate={{ y: "-105vh", opacity: [0, 0.4, 0.4, 0] }}
          transition={{ duration: it.duration, delay: it.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {it.emoji}
        </motion.span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foto: única (hero) ou várias (carrossel com crossfade)
// ---------------------------------------------------------------------------
function PhotoHero({ photos, name, glow }: { photos: string[]; name: string; glow: string }) {
  const [idx, setIdx] = useState(0);
  const initials = (name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3500);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
      className={cn(
        "relative mx-auto h-40 w-40 overflow-hidden rounded-full ring-4 ring-white/70 dark:ring-white/10 sm:h-48 sm:w-48",
        glow,
      )}
    >
      {photos.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center bg-white/40 text-4xl font-black text-foreground/70 backdrop-blur dark:bg-white/5">
          {initials}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={photos[idx]}
            alt={name}
            className="h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        </AnimatePresence>
      )}
      {/* anel girando de brilho */}
      <motion.span
        className="pointer-events-none absolute -inset-2 rounded-full border border-white/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function CelebrationStage({
  data,
  variant,
}: {
  data: CelebrationData;
  variant: "owner" | "guest";
}) {
  const { theme } = data;
  const [paragraphs, setParagraphs] = useState(data.paragraphs);
  const [photos, setPhotos] = useState(data.photos);
  const [source, setSource] = useState<CelebrationSource>(data.source);
  const [copied, setCopied] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const share = async () => {
    if (!data.shareUrl) return;
    const shareData = {
      title: `Feliz aniversário, ${data.displayName}!`,
      text: `Uma homenagem especial para ${data.displayName} 🎉`,
      url: data.shareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* usuário cancelou o share nativo — cai pro copiar */
    }
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      toast.success("Link copiado! Mande para a pessoa. 🎁");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não consegui copiar o link.");
    }
  };

  return (
    <main className={cn("relative min-h-dvh w-full overflow-hidden", theme.background)}>
      {/* Blobs de aurora */}
      <motion.div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/40 blur-3xl dark:bg-white/5"
        animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-white/30 blur-3xl dark:bg-white/5"
        animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <FloatingEmojis emojis={theme.floaters} />
      <ConfettiRain colors={theme.confetti} />

      {/* Voltar (só dono) */}
      {variant === "owner" && (
        <Link
          href="/social"
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold text-foreground/70 backdrop-blur transition-colors hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
      )}

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {/* Selo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60 backdrop-blur dark:bg-white/10"
        >
          <Cake className="h-3.5 w-3.5" /> {data.isToday ? "É hoje!" : "Celebração"}
        </motion.div>

        <PhotoHero photos={photos} name={data.fullName} glow={theme.glow} />

        {/* Saudação */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-lg font-medium text-foreground/70 sm:text-xl"
        >
          {theme.greeting},
        </motion.p>

        {/* Nome — grande e com a cor do tema */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 130, damping: 12, delay: 0.4 }}
          className={cn(
            "mt-1 bg-clip-text text-5xl font-black leading-tight tracking-tight sm:text-7xl",
            theme.accentText,
          )}
        >
          {data.displayName}!
        </motion.h1>

        {/* Idade */}
        {data.age && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-1.5 text-sm font-bold text-foreground/80 shadow-sm backdrop-blur dark:bg-white/10"
          >
            <Sparkles className="h-4 w-4" />
            {data.isToday ? `${data.age} anos hoje` : `Fazendo ${data.age} anos`}
          </motion.div>
        )}

        {/* Homenagem */}
        <div className="mt-10 space-y-4">
          {paragraphs.map((p, i) => (
            <motion.p
              key={`${i}-${p.slice(0, 12)}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.25 }}
              className="text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg"
            >
              {p}
            </motion.p>
          ))}
        </div>

        {/* Ações do dono */}
        {variant === "owner" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + paragraphs.length * 0.25 + 0.2 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            {data.shareUrl && (
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Link copiado!" : "Compartilhar com a pessoa"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2.5 text-sm font-semibold text-foreground/80 backdrop-blur transition-colors hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <Pencil className="h-4 w-4" />
              Personalizar texto e fotos
            </button>
          </motion.div>
        )}

        {/* Rodapé / marca */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-12 flex items-center gap-1.5 text-[11px] font-medium text-foreground/40"
        >
          <Heart className="h-3 w-3 fill-current" />
          {variant === "guest" ? (
            <span>
              Feito com carinho no{" "}
              <Link href="/" className="font-semibold hover:text-foreground/70">Life OS</Link>
            </span>
          ) : (
            <span>
              {source === "custom"
                ? "Mensagem personalizada por você"
                : source === "ai"
                  ? "Mensagem criada pela sua IA"
                  : "Mensagem gerada localmente"}
            </span>
          )}
        </motion.div>
      </div>

      {/* Editor do dono (texto + fotos) */}
      {variant === "owner" && (
        <CelebrationEditor
          friendId={data.friendId}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onMessageSaved={(p, s) => { setParagraphs(p); setSource(s); }}
          onPhotosChanged={setPhotos}
        />
      )}
    </main>
  );
}
