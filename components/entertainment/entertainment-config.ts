// Tipos e configuração de tipos/status do board de entretenimento.
import {
  Clapperboard, Gamepad2, Disc, Tv, BookOpen,
  BookmarkPlus, PlayCircle, CheckCircle2, XCircle, LucideIcon,
} from "lucide-react";

export type MediaItemData = {
  id: string;
  title: string;
  type: string;
  status: string;
  overview: string | null;
  coverUrl: string | null;
  genres: string | null;
  creator: string | null;
  releaseYear: string | null;
  rating?: number | null;
  notes?: string | null;
};

export type MediaTabType = "ALL" | "WATCH" | "PLAY" | "LISTEN" | "READ";

export interface StatusConfigItem {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  activeClass: string;
}

export const TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  MOVIE: { icon: Clapperboard, label: "Filme" },
  TV_SHOW: { icon: Tv, label: "Série" },
  GAME: { icon: Gamepad2, label: "Jogo" },
  ALBUM: { icon: Disc, label: "Álbum" },
  BOOK: { icon: BookOpen, label: "Livro" },
};

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  PLAN_TO_WATCH: {
    label: "Na Lista",
    icon: BookmarkPlus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    activeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  IN_PROGRESS: {
    label: "Consumindo",
    icon: PlayCircle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    activeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  COMPLETED: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    activeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  DROPPED: {
    label: "Abandonado",
    icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    activeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  },
};
