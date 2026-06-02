"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Clapperboard, Gamepad2, LayoutGrid, Dices,
  Music2, Trophy, Filter, BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import { STATUS_CONFIG, type MediaItemData, type MediaTabType } from "./entertainment-config";
import { StatusFilterButton } from "./status-filter-button";
import { MediaCard } from "./media-card";
import { RandomPickDialog } from "./random-pick-dialog";

/* ========================================================================= */
/* COMPONENTE PRINCIPAL: BOARD                                               */
/* ========================================================================= */
export function EntertainmentBoard({ initialItems }: { initialItems: MediaItemData[] }) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<MediaTabType>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [randomItem, setRandomItem] = useState<MediaItemData | null>(null);

  const filteredItems = useMemo(() => {
    let items = [...initialItems];

    // Filtro por Aba (Tipo)
    if (activeTypeTab === "WATCH") items = items.filter((i) => i.type === "MOVIE" || i.type === "TV_SHOW");
    if (activeTypeTab === "PLAY") items = items.filter((i) => i.type === "GAME");
    if (activeTypeTab === "LISTEN") items = items.filter((i) => i.type === "ALBUM");
    if (activeTypeTab === "READ") items = items.filter((i) => i.type === "BOOK");

    // Filtro por Status
    if (activeStatusFilter !== "ALL") items = items.filter((i) => i.status === activeStatusFilter);

    // Filtro de Busca por Texto
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.creator && i.creator.toLowerCase().includes(q)) ||
          (i.releaseYear && i.releaseYear.includes(q))
      );
    }

    return items;
  }, [initialItems, activeTypeTab, activeStatusFilter, filterQuery]);

  const stats = useMemo(
    () => ({
      total: initialItems.length,
      watch: initialItems.filter((i) => i.type === "MOVIE" || i.type === "TV_SHOW").length,
      play: initialItems.filter((i) => i.type === "GAME").length,
      listen: initialItems.filter((i) => i.type === "ALBUM").length,
      read: initialItems.filter((i) => i.type === "BOOK").length, // Estatística de Livros
    }),
    [initialItems]
  );

  const handlePickRandom = () => {
    const pool = filteredItems.filter((i) => i.status === "PLAN_TO_WATCH").length > 0
        ? filteredItems.filter((i) => i.status === "PLAN_TO_WATCH")
        : filteredItems;

    if (pool.length === 0) {
      toast.info("Nada para sugerir. Adicione mais itens à sua lista!");
      return;
    }

    setRandomItem(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE FILTROS */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">

        <ScrollArea className="w-full xl:w-auto">
            <Tabs defaultValue="ALL" onValueChange={(v) => { setActiveTypeTab(v as MediaTabType); setActiveStatusFilter("ALL"); }}>
            <TabsList className="flex w-max bg-muted/50 p-1 rounded-xl shadow-sm border border-border/50 h-auto">
                <TabsTrigger value="ALL" className="py-2 px-3 rounded-lg"><LayoutGrid className="h-4 w-4 mr-2" /> Geral ({stats.total})</TabsTrigger>
                <TabsTrigger value="WATCH" className="py-2 px-3 rounded-lg"><Clapperboard className="h-4 w-4 mr-2" /> Assistir ({stats.watch})</TabsTrigger>
                <TabsTrigger value="PLAY" className="py-2 px-3 rounded-lg"><Gamepad2 className="h-4 w-4 mr-2" /> Jogar ({stats.play})</TabsTrigger>
                <TabsTrigger value="LISTEN" className="py-2 px-3 rounded-lg"><Music2 className="h-4 w-4 mr-2" /> Ouvir ({stats.listen})</TabsTrigger>
                <TabsTrigger value="READ" className="py-2 px-3 rounded-lg"><BookOpen className="h-4 w-4 mr-2" /> Ler ({stats.read})</TabsTrigger>
            </TabsList>
            </Tabs>
        </ScrollArea>

        <div className="flex gap-2 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar título, ano..." className="pl-9 h-10 w-full bg-card rounded-lg" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handlePickRandom} className="h-10 text-primary border-primary/20 hover:bg-primary/10 shadow-sm shrink-0" title="Sortear algo para consumir">
            <Dices className="h-5 w-5 md:mr-2" /> <span className="hidden md:inline">Sortear</span>
          </Button>
        </div>
      </div>

      {/* FILTROS DE STATUS (Chips) */}
      <div className="flex flex-wrap gap-2 items-center border-b border-border/50 pb-4">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider mr-2">
          <Filter className="h-3 w-3" /> Status
        </span>
        <StatusFilterButton label="Todos" isActive={activeStatusFilter === "ALL"} onClick={() => setActiveStatusFilter("ALL")} />
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <StatusFilterButton key={key} label={cfg.label} icon={cfg.icon} isActive={activeStatusFilter === key} onClick={() => setActiveStatusFilter(key)} activeClass={cfg.activeClass} />
        ))}
      </div>

      {/* GRID DE CARDS */}
      {filteredItems.length === 0 ? (
        <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-muted/10 shadow-sm">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-base font-semibold text-foreground">Nada por aqui</p>
          <p className="text-sm text-muted-foreground mt-1">Sua coleção está vazia para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 items-start">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* MODAL DE SORTEIO */}
      <RandomPickDialog item={randomItem} onClose={() => setRandomItem(null)} onReroll={handlePickRandom} />
    </div>
  );
}
