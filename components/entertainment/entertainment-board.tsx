"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Clapperboard, Gamepad2, Disc, LayoutGrid, Dices, 
  Trash2, Tv, Music2, Trophy, Heart, CheckCircle2, PlayCircle, 
  MoreVertical, BookmarkPlus, LucideIcon, Filter, Sparkles, XCircle,
  Star, Calendar, User, AlignLeft, Loader2
} from "lucide-react";
import { deleteMediaItem, updateMediaStatus, updateMediaDetails } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Tipagem baseada no que o Server Component manda
type MediaItemData = {
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
  TV_SHOW: { icon: Tv, label: "Série" },
  GAME: { icon: Gamepad2, label: "Jogo" },
  ALBUM: { icon: Disc, label: "Álbum" },
};

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
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

export function EntertainmentBoard({ initialItems }: { initialItems: MediaItemData[] }) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<MediaTabType>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [randomItem, setRandomItem] = useState<MediaItemData | null>(null);

  const filteredItems = useMemo(() => {
    let items = [...initialItems];

    if (activeTypeTab === "WATCH") items = items.filter((i) => i.type === "MOVIE" || i.type === "TV_SHOW");
    if (activeTypeTab === "PLAY") items = items.filter((i) => i.type === "GAME");
    if (activeTypeTab === "LISTEN") items = items.filter((i) => i.type === "ALBUM");

    if (activeStatusFilter !== "ALL") items = items.filter((i) => i.status === activeStatusFilter);

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
      {/* HEADER DE FILTROS (Mantido igual) */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <Tabs defaultValue="ALL" onValueChange={(v) => { setActiveTypeTab(v as MediaTabType); setActiveStatusFilter("ALL"); }}>
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl shadow-sm border border-border/50">
            <TabsTrigger value="ALL"><LayoutGrid className="h-4 w-4 mr-2" /> Geral ({stats.total})</TabsTrigger>
            <TabsTrigger value="WATCH"><Clapperboard className="h-4 w-4 mr-2" /> Assistir ({stats.watch})</TabsTrigger>
            <TabsTrigger value="PLAY"><Gamepad2 className="h-4 w-4 mr-2" /> Jogar ({stats.play})</TabsTrigger>
            <TabsTrigger value="LISTEN"><Music2 className="h-4 w-4 mr-2" /> Ouvir ({stats.listen})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar título, ano ou autor..." className="pl-9 w-full md:w-64 bg-card/50" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={handlePickRandom} className="text-primary border-primary/20 hover:bg-primary/10 shadow-sm" title="Sortear algo para consumir">
            <Dices className="h-5 w-5" />
          </Button>
        </div>
      </div>

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
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-lg font-semibold text-foreground">Nada por aqui</p>
          <p className="text-sm text-muted-foreground mt-1">Sua coleção está vazia para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* MODAL DE SORTEIO (Mantido igual) */}
      <Dialog open={!!randomItem} onOpenChange={() => setRandomItem(null)}>
        <DialogContent className="sm:max-w-sm text-center border-border shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-gradient-to-b from-primary/20 to-background p-8 pt-10 relative">
              <div className="absolute top-4 right-4 text-primary opacity-50"><Sparkles className="h-6 w-6"/></div>
              <DialogHeader>
                <DialogTitle className="flex flex-col items-center gap-3 text-2xl font-bold">Sua Sessão de Hoje</DialogTitle>
                <DialogDescription className="text-muted-foreground">O destino escolheu esta obra para você.</DialogDescription>
              </DialogHeader>

              {randomItem && (
                <div className="mt-6 flex flex-col items-center">
                  {randomItem.coverUrl ? (
                      <img src={randomItem.coverUrl} alt={randomItem.title} className="w-32 rounded-xl shadow-lg border border-border/50 mb-4" />
                  ) : (
                      <div className="w-32 h-48 bg-muted rounded-xl mb-4 flex items-center justify-center"><Clapperboard className="h-8 w-8 text-muted-foreground/30"/></div>
                  )}
                  <h3 className="font-extrabold text-xl leading-tight">{randomItem.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{randomItem.releaseYear || "Ano desconhecido"}</p>
                  
                  <Badge className="mt-3 bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-none">
                    {TYPE_CONFIG[randomItem.type]?.label}
                  </Badge>
                </div>
              )}
          </div>
          <DialogFooter className="flex gap-2 p-4 bg-muted/10 border-t border-border/50">
            <Button variant="ghost" onClick={handlePickRandom} className="flex-1 border border-border bg-background shadow-sm hover:bg-muted"><Dices className="h-4 w-4 mr-2"/> Rodar de novo</Button>
            <Button onClick={() => setRandomItem(null)} className="flex-1 shadow-lg shadow-primary/20">Vou consumir!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusFilterButton({ label, icon: Icon, isActive, onClick, activeClass }: { label: string; icon?: LucideIcon; isActive: boolean; onClick: () => void; activeClass?: string; }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200", isActive ? activeClass || "bg-secondary text-secondary-foreground border-border shadow-sm" : "bg-background text-muted-foreground border-transparent hover:bg-muted hover:border-border/50")}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

// ----------------------------------------------------------------------
// MEDIA CARD & DETAILS DIALOG (Onde a mágica acontece)
// ----------------------------------------------------------------------
function MediaCard({ item }: { item: MediaItemData }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para edição rápida dentro do modal
  const [rating, setRating] = useState(item.rating || 0);
  const [notes, setNotes] = useState(item.notes || "");

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.MOVIE;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PLAN_TO_WATCH;
  const Icon = config.icon;

  const handleStatusChange = (newStatus: string) => {
    updateMediaStatus(item.id, newStatus).then((r) =>
      r.success ? toast.success("Status atualizado!") : toast.error("Erro ao atualizar")
    );
  };

  const handleSaveDetails = async () => {
    setIsLoading(true);
    const res = await updateMediaDetails(item.id, rating, notes);
    if (res.success) {
      toast.success("Review salva com sucesso!");
      setIsDetailsOpen(false);
    } else {
      toast.error("Erro ao salvar sua review.");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      {/* 1. O CARD (Serve como Trigger pro Modal de Detalhes) */}
      <div className="group relative flex flex-col h-full bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
        
        <DialogTrigger asChild>
            <div className={cn("relative overflow-hidden rounded-t-xl bg-muted/30 shrink-0 cursor-pointer", item.type === "GAME" ? "aspect-video" : item.type === "ALBUM" ? "aspect-square" : "aspect-[2/3]")}>
            {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground/30"><Icon className="h-12 w-12" /></div>
            )}

            {/* Efeito Hover ("Netflix") */}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{item.releaseYear || config.label}</p>
                <p className="text-[11px] leading-relaxed line-clamp-5 text-zinc-300">{item.overview || "Clique para ver detalhes e adicionar sua review."}</p>
                
                {/* Mostra as estrelinhas no hover se já tiver nota */}
                {item.rating && item.rating > 0 ? (
                    <div className="flex mt-3 gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                            <Star key={i} className={cn("h-3 w-3", i < item.rating! ? "fill-amber-400 text-amber-400" : "text-white/20")} />
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Badge de Status */}
            <div className={cn("absolute top-2 left-2 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 shadow-sm backdrop-blur-md", status.bg, status.color )}>
                <status.icon className="h-3 w-3" /> {status.label}
            </div>
            </div>
        </DialogTrigger>

        {/* Botão de Opções Rápidas (Fica Fora do Trigger do Modal) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm border border-white/10">
                <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Mover para...</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={item.status} onValueChange={handleStatusChange}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <DropdownMenuRadioItem key={k} value={k} className="cursor-pointer">
                    <v.icon className="h-3.5 w-3.5 mr-2" /> {v.label}
                    </DropdownMenuRadioItem>
                ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => deleteMediaItem(item.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Remover
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Área de Texto Inferior */}
        <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
            <h4 className="font-bold text-sm text-foreground line-clamp-1 leading-tight" title={item.title}>{item.title}</h4>
            {item.creator && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.creator}</p>}
            </div>
        </div>
      </div>

      {/* 2. O MODAL DE DETALHES RICOS */}
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border/60 shadow-2xl rounded-2xl flex flex-col md:flex-row max-h-[90vh]">
          <DialogHeader className="sr-only">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Detalhes da obra</DialogDescription>
          </DialogHeader>
          
          {/* Lado Esquerdo: Poster Grande */}
          <div className={cn("w-full md:w-2/5 bg-muted relative shrink-0", item.type === "GAME" ? "aspect-video md:aspect-auto" : "aspect-square md:aspect-auto")}>
              {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                  <div className="flex items-center justify-center h-full"><Icon className="h-16 w-16 text-muted-foreground/30" /></div>
              )}
              {/* Gradiente sutil para fundir com a cor de fundo */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:hidden" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background hidden md:block" />
          </div>

          {/* Lado Direito: Informações e Formulário */}
          <div className="w-full md:w-3/5 flex flex-col">
              <ScrollArea className="flex-1 p-6 md:p-8">
                  <div className="space-y-6 pb-6">
                      
                      {/* Título e Metadados */}
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none"><Icon className="h-3 w-3 mr-1"/>{config.label}</Badge>
                              {item.releaseYear && <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50"><Calendar className="h-3 w-3 mr-1"/>{item.releaseYear}</Badge>}
                          </div>
                          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">{item.title}</h2>
                          {item.creator && <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5"/> {item.creator}</p>}
                      </div>

                      {/* Sinopse */}
                      {item.overview && (
                          <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5"/> Sinopse</h3>
                              <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/40">
                                  {item.overview}
                              </p>
                          </div>
                      )}

                      {/* Seção Interativa: Avaliação e Review */}
                      <div className="space-y-4 pt-4 border-t border-border/40">
                          <h3 className="text-sm font-bold text-foreground">Sua Avaliação</h3>
                          
                          {/* Estrelas Interativas */}
                          <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                      key={star}
                                      type="button"
                                      onClick={() => setRating(star)}
                                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                  >
                                      <Star className={cn("h-8 w-8 transition-colors", rating >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-400/50")} />
                                  </button>
                              ))}
                              <span className="ml-3 text-xs text-muted-foreground font-medium">{rating > 0 ? `${rating}/5 Estrelas` : "Sem nota"}</span>
                          </div>

                          {/* Campo de Anotações/Review */}
                          <div className="space-y-2">
                              <Textarea 
                                  placeholder="O que você achou? Escreva sua resenha pessoal aqui..." 
                                  className="min-h-[120px] resize-none bg-muted/20 focus:bg-background border-border/50"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                              />
                          </div>
                      </div>
                  </div>
              </ScrollArea>

              {/* Rodapé Fixo do Modal */}
              <div className="p-4 md:p-6 bg-muted/10 border-t border-border/40 flex justify-end gap-3 shrink-0">
                  <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveDetails} disabled={isLoading} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 min-w-[120px]">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Review"}
                  </Button>
              </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}