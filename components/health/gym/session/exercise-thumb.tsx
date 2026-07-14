"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSCLE_META, groupOfExercise } from "../exercise-db";
import { getAllMedia, mediaFor, youtubeThumb, MEDIA_EVENT } from "./exercise-media";
import { customArtFor } from "./custom-art";
import { useExerciseImages } from "./exercise-images";

// Capa do exercício, em ordem de prioridade:
//  1) FOTO própria do usuário (localStorage) — escolha explícita vence tudo;
//  2) vídeo do YouTube salvo → thumbnail;
//  3) arte EMBUTIDA (/public/exercises, recortes das fichas do personal);
//  4) demonstração animada (free-exercise-db, alterna 2 frames);
//  5) capa em gradiente na cor do grupo + inicial (fallback offline/sem match).

function initial(name: string): string {
  const m = name.trim().match(/[\p{L}\p{N}]/u);
  return (m?.[0] ?? "?").toUpperCase();
}

// Foto própria do usuário para o exercício (pós-hidratação, sem mismatch de SSR).
function useUserImage(name?: string): string | undefined {
  const [img, setImg] = useState<string | undefined>(undefined);
  useEffect(() => {
    const read = () => setImg(name?.trim() ? mediaFor(getAllMedia(), name)?.image : undefined);
    read();
    window.addEventListener(MEDIA_EVENT, read);
    return () => window.removeEventListener(MEDIA_EVENT, read);
  }, [name]);
  return img;
}

export function ExerciseThumb({
  name,
  group,
  youtubeId,
  size = "sm",
  showPlay = true,
  onClick,
  className,
}: {
  name: string;
  group?: string;
  youtubeId?: string;
  size?: "sm" | "lg";
  showPlay?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const g = group || groupOfExercise(name);
  const color = (g && MUSCLE_META[g]?.color) || "#6366f1";
  const interactive = !!onClick;

  const userImage = useUserImage(name);
  const art = customArtFor(name);

  // Demonstração animada (pula a busca se já houver vídeo/arte embutida).
  const imgs = useExerciseImages(youtubeId || art ? undefined : name);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  const animated = !youtubeId && imgs && imgs.length > 0 && !failed;

  useEffect(() => {
    if (!imgs || imgs.length < 2 || failed) return;
    const t = setInterval(() => setFrame((f) => f + 1), 850);
    return () => clearInterval(t);
  }, [imgs, failed]);

  let inner: ReactNode;
  if (userImage) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element -- dataURL local do usuário
      <img src={userImage} alt="" className="h-full w-full object-cover" />
    );
  } else if (youtubeId) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element -- thumbnail externa do YouTube
      <img src={youtubeThumb(youtubeId)} alt="" className="h-full w-full object-cover" />
    );
  } else if (art) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element -- arte local em /public
      <img src={art} alt="" loading="lazy" className="h-full w-full bg-white object-contain" />
    );
  } else if (animated && imgs) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element -- demonstração externa (CDN)
      <img
        src={imgs[frame % imgs.length]}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full bg-white object-contain"
      />
    );
  } else {
    inner = (
      <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(140deg, ${color} 0%, ${color}80 100%)` }}>
        <span className={cn("font-black text-white/90 drop-shadow", size === "lg" ? "text-5xl" : "text-lg")}>{initial(name)}</span>
      </div>
    );
  }

  const body = (
    <>
      {inner}
      {showPlay && (
        <>
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/thumb:opacity-100">
            <Play className={cn("fill-white text-white", size === "lg" ? "h-8 w-8" : "h-4 w-4")} />
          </span>
          <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Play className="h-2 w-2 fill-current" />
          </span>
        </>
      )}
    </>
  );

  const cls = cn("group/thumb relative shrink-0 overflow-hidden border border-border/40", className);

  return interactive ? (
    <button type="button" onClick={onClick} aria-label={`Demonstração de ${name}`} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
