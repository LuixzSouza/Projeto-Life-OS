"use client";

import { useState, useMemo, useTransition } from "react";
import { MediaItem } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clapperboard,
  Gamepad2,
  Disc,
  LayoutGrid,
  Dices,
  Trash2,
  Tv,
  Music2,
  Trophy,
  Heart,
  CheckCircle2,
  PlayCircle,
  MoreVertical,
  BookmarkPlus,
  LucideIcon,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  deleteMediaItem,
  updateMediaStatus,
} from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MediaTabType = "ALL" | "WATCH" | "PLAY" | "LISTEN";

interface StatusConfigItem {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  activeClass: string;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  MOVIE: { icon: Clapperboard, label: "Filme" },
  TV: { icon: Tv, label: "Série" },
  GAME: { icon: Gamepad2, label: "Jogo" },
  ALBUM: { icon: Disc, label: "Álbum" },
};

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  WISHLIST: {
    label: "Na Lista",
    icon: BookmarkPlus,
    color: "text-primary",
    bg: "bg-primary/10",
    activeClass:
      "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20",
  },
  PLAYING: {
    label: "Consumindo",
    icon: PlayCircle,
    color: "text-primary",
    bg: "bg-primary/10",
    activeClass:
      "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20",
  },
  COMPLETED: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/10",
    activeClass:
      "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20",
  },
  FAVORITE: {
    label: "Favorito",
    icon: Heart,
    color: "text-primary",
    bg: "bg-primary/10",
    activeClass:
      "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20",
  },
};

export function EntertainmentBoard({
  initialItems,
}: {
  initialItems: MediaItem[];
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<MediaTabType>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [randomItem, setRandomItem] = useState<MediaItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    let items = [...initialItems];

    if (activeTypeTab === "WATCH")
      items = items.filter(
        (i) => i.type === "MOVIE" || i.type === "TV"
      );
    if (activeTypeTab === "PLAY")
      items = items.filter((i) => i.type === "GAME");
    if (activeTypeTab === "LISTEN")
      items = items.filter((i) => i.type === "ALBUM");

    if (activeStatusFilter !== "ALL")
      items = items.filter((i) => i.category === activeStatusFilter);

    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(q))
      );
    }

    return items;
  }, [initialItems, activeTypeTab, activeStatusFilter, filterQuery]);

  const stats = useMemo(
    () => ({
      total: initialItems.length,
      watch: initialItems.filter(
        (i) => i.type === "MOVIE" || i.type === "TV"
      ).length,
      play: initialItems.filter((i) => i.type === "GAME").length,
      listen: initialItems.filter((i) => i.type === "ALBUM").length,
    }),
    [initialItems]
  );

  const handlePickRandom = () => {
    const pool =
      filteredItems.filter((i) => i.category === "WISHLIST").length > 0
        ? filteredItems.filter((i) => i.category === "WISHLIST")
        : filteredItems;

    if (pool.length === 0) {
      toast.info("Nada para sugerir.");
      return;
    }

    setRandomItem(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <Tabs
          defaultValue="ALL"
          onValueChange={(v) => {
            setActiveTypeTab(v as MediaTabType);
            setActiveStatusFilter("ALL");
          }}
        >
          <TabsList className="grid grid-cols-4 bg-muted p-1 rounded-xl">
            <TabsTrigger value="ALL">
              <LayoutGrid className="h-4 w-4 mr-2" /> Geral ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="WATCH">
              <Clapperboard className="h-4 w-4 mr-2" /> Assistir ({stats.watch})
            </TabsTrigger>
            <TabsTrigger value="PLAY">
              <Gamepad2 className="h-4 w-4 mr-2" /> Jogar ({stats.play})
            </TabsTrigger>
            <TabsTrigger value="LISTEN">
              <Music2 className="h-4 w-4 mr-2" /> Ouvir ({stats.listen})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 w-64"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePickRandom}
            className="text-primary"
          >
            <Dices className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center border-b pb-3">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" /> FILTRO
        </span>
        <StatusFilterButton
          label="Todos"
          isActive={activeStatusFilter === "ALL"}
          onClick={() => setActiveStatusFilter("ALL")}
        />
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <StatusFilterButton
            key={key}
            label={cfg.label}
            icon={cfg.icon}
            isActive={activeStatusFilter === key}
            onClick={() => setActiveStatusFilter(key)}
            activeClass={cfg.activeClass}
          />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nada por aqui</p>
          <p className="text-sm text-muted-foreground">
            Adicione novos itens à coleção
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <Dialog open={!!randomItem} onOpenChange={() => setRandomItem(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              Sugestão do Momento
            </DialogTitle>
            <DialogDescription>
              Algo perfeito para agora
            </DialogDescription>
          </DialogHeader>

          {randomItem && (
            <div className="mt-4">
              <h3 className="font-bold text-lg">{randomItem.title}</h3>
              <Badge className="mt-2" variant="outline">
                {TYPE_CONFIG[randomItem.type]?.label}
              </Badge>
            </div>
          )}

          <DialogFooter className="sm:justify-center gap-2">
            <Button onClick={() => setRandomItem(null)}>Aceitar</Button>
            <Button variant="ghost" onClick={handlePickRandom}>
              Outra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusFilterButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  activeClass,
}: {
  label: string;
  icon?: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition",
        isActive
          ? activeClass
          : "bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.MOVIE;
  const status =
    STATUS_CONFIG[item.category || "WISHLIST"] || STATUS_CONFIG.WISHLIST;
  const Icon = config.icon;

  const handleStatusChange = (status: string) => {
    updateMediaStatus(item.id, status).then((r) =>
      r.success
        ? toast.success("Status atualizado")
        : toast.error("Erro ao atualizar")
    );
  };

  return (
    <div className="group relative">
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-muted transition hover:shadow-lg",
          item.type === "GAME" ? "aspect-video" : "aspect-[2/3]"
        )}
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-105 transition"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Icon className="h-10 w-10" />
          </div>
        )}

        <div
          className={cn(
            "absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1",
            status.bg,
            status.color
          )}
        >
          <status.icon className="h-3 w-3" />
          {status.label}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={item.category || "WISHLIST"}
                onValueChange={handleStatusChange}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    <v.icon className="h-3.5 w-3.5 mr-2" />
                    {v.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  deleteMediaItem(item.id);
                  toast.success("Item removido");
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
