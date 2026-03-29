"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Clapperboard, Gamepad2, Disc, LayoutGrid, Dices, 
  Trash2, Tv, Music2, Trophy, CheckCircle2, PlayCircle, 
  MoreVertical, BookmarkPlus, LucideIcon, Filter, Sparkles, XCircle,
  Star, Calendar, User, AlignLeft, Loader2, BookOpen, ImageOff
} from "lucide-react";
import { deleteMediaItem, updateMediaStatus, updateMediaDetails } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- TIPAGENS ---
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

// 🟢 ADICIONADO: Aba READ para Livros
type MediaTabType = "ALL" | "WATCH" | "PLAY" | "LISTEN" | "READ";

interface StatusConfigItem {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  activeClass: string;
}

// 🟢 ADICIONADO: Categoria BOOK
const TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  MOVIE: { icon: Clapperboard, label: "Filme" },
  TV_SHOW: { icon: Tv, label: "Série" },
  GAME: { icon: Gamepad2, label: "Jogo" },
  ALBUM: { icon: Disc, label: "Álbum" },
  BOOK: { icon: BookOpen, label: "Livro" }, 
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
      <Dialog open={!!randomItem} onOpenChange={() => setRandomItem(null)}>
        <DialogContent className="sm:max-w-sm text-center border-border shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-gradient-to-b from-primary/10 to-background p-8 pt-10 relative">
              <div className="absolute top-4 right-4 text-primary opacity-50"><Sparkles className="h-6 w-6"/></div>
              <DialogHeader>
                <DialogTitle className="flex flex-col items-center gap-2 text-2xl font-bold">Sua Sessão de Hoje</DialogTitle>
                <DialogDescription className="text-muted-foreground">O destino escolheu esta obra para você.</DialogDescription>
              </DialogHeader>

              {randomItem && (
                <div className="mt-8 flex flex-col items-center">
                  {randomItem.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={randomItem.coverUrl} alt={randomItem.title} className={cn("rounded-xl shadow-lg border border-border/50 mb-5 object-cover", randomItem.type === "ALBUM" ? "w-40 aspect-square" : randomItem.type === "GAME" ? "w-48 aspect-video" : "w-32 aspect-[2/3]")} />
                  ) : (
                      <div className="w-32 aspect-[2/3] bg-muted rounded-xl mb-5 flex items-center justify-center"><Clapperboard className="h-8 w-8 text-muted-foreground/30"/></div>
                  )}
                  <h3 className="font-extrabold text-xl leading-tight line-clamp-2 px-4">{randomItem.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{randomItem.releaseYear || "Ano desconhecido"}</p>
                  
                  <Badge className="mt-3 bg-primary/10 text-primary shadow-none border-none">
                    {TYPE_CONFIG[randomItem.type]?.label || "Mídia"}
                  </Badge>
                </div>
              )}
          </div>
          <DialogFooter className="flex gap-2 p-4 bg-muted/10 border-t border-border/50">
            <Button variant="ghost" onClick={handlePickRandom} className="flex-1 bg-background hover:bg-muted shadow-sm"><Dices className="h-4 w-4 mr-2"/> Rodar de novo</Button>
            <Button onClick={() => setRandomItem(null)} className="flex-1 shadow-lg">Vou consumir!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponente de Filtro
function StatusFilterButton({ label, icon: Icon, isActive, onClick, activeClass }: { label: string; icon?: LucideIcon; isActive: boolean; onClick: () => void; activeClass?: string; }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200", isActive ? activeClass || "bg-secondary text-secondary-foreground border-border shadow-sm" : "bg-background text-muted-foreground border-transparent hover:bg-muted hover:border-border/50")}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

/* ========================================================================= */
/* COMPONENTE: MEDIA CARD & REVIEW MODAL                                     */
/* ========================================================================= */
function MediaCard({ item }: { item: MediaItemData }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [rating, setRating] = useState(item.rating || 0);
  const [notes, setNotes] = useState(item.notes || "");

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.MOVIE;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PLAN_TO_WATCH;
  const Icon = config.icon;

  // Lógica de Proporção Baseada no Tipo
  const aspectRatioClass = 
    item.type === "GAME" ? "aspect-video" : 
    item.type === "ALBUM" ? "aspect-square" : 
    "aspect-[2/3]"; // Padrão para Filmes, Séries e Livros

  const handleStatusChange = (newStatus: string) => {
    updateMediaStatus(item.id, newStatus).then((r) =>
      r.success ? toast.success("Status atualizado!") : toast.error("Erro ao atualizar")
    );
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <>
      {/* 1. O CARD VISUAL */}
      <div className="group relative flex flex-col h-full rounded-xl transition-all duration-300">
        
        {/* ÁREA DA IMAGEM (Clicável para abrir Detalhes) */}
        <div 
            onClick={() => setIsDetailsOpen(true)}
            className={cn("relative overflow-hidden rounded-xl bg-muted/40 shrink-0 cursor-pointer shadow-sm border border-border/40 hover:border-primary/40 hover:shadow-md transition-all group-hover:-translate-y-1", aspectRatioClass)}
        >
            {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground/30"><Icon className="h-10 w-10" /></div>
            )}

            {/* Sombra interna para dar leitura as badges */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-60" />

            {/* Badge de Status (Fixo no canto superior esquerdo) */}
            <div className={cn("absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1 shadow-sm backdrop-blur-md", status.bg, status.color )}>
                <status.icon className="h-3 w-3" />
            </div>
        </div>

        {/* MENU DROPDOWN DE OPÇÕES (Fica FORA do clicável da imagem) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-black/50 hover:bg-black/80 text-white rounded-md backdrop-blur-sm border border-white/10">
                        <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Mover para...</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={item.status} onValueChange={handleStatusChange}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <DropdownMenuRadioItem key={k} value={k} className="cursor-pointer text-xs font-medium">
                            <v.icon className="h-3.5 w-3.5 mr-2" /> {v.label}
                        </DropdownMenuRadioItem>
                    ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer text-xs font-medium" onClick={() => deleteMediaItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover da Biblioteca
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* ÁREA DE TEXTO (Abaixo da Imagem) */}
        <div className="pt-3 pb-1 px-1 flex-1 flex flex-col justify-start">
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight flex-1" title={item.title}>{item.title}</h4>
                {/* Estrelas (Se existirem) */}
                {item.rating && item.rating > 0 ? (
                    <div className="flex items-center bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500 mr-1" />
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500">{item.rating}</span>
                    </div>
                ) : null}
            </div>
            
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground truncate">
                <span className="truncate">{item.creator || config.label}</span>
                {item.releaseYear && (
                    <>
                        <span className="opacity-50">•</span>
                        <span>{item.releaseYear}</span>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* 2. O MODAL DE DETALHES RICOS */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border/60 shadow-2xl rounded-2xl flex flex-col md:flex-row max-h-[90vh]">
            <DialogHeader className="sr-only">
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription>Detalhes e review da obra</DialogDescription>
            </DialogHeader>
            
            {/* Lado Esquerdo: Poster Grande */}
            <div className={cn("w-full md:w-2/5 bg-muted relative shrink-0", aspectRatioClass, "md:aspect-auto")}>
                {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full"><ImageOff className="h-16 w-16 text-muted-foreground/30" /></div>
                )}
                {/* Gradiente para mesclar com o fundo no mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent md:hidden" />
                {/* Borda direita sutil no desktop */}
                <div className="absolute inset-y-0 right-0 w-px bg-border/40 hidden md:block" />
            </div>

            {/* Lado Direito: Informações e Formulário */}
            <div className="w-full md:w-3/5 flex flex-col">
                <ScrollArea className="flex-1 p-6 md:p-8">
                    <div className="space-y-6 pb-6">
                        
                        {/* Título e Metadados */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none"><Icon className="h-3 w-3 mr-1"/>{config.label}</Badge>
                                {item.releaseYear && <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50"><Calendar className="h-3 w-3 mr-1"/>{item.releaseYear}</Badge>}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight text-foreground">{item.title}</h2>
                            {item.creator && <p className="text-muted-foreground text-sm mt-1.5 flex items-center gap-1.5"><User className="h-3.5 w-3.5"/> {item.creator}</p>}
                        </div>

                        {/* Sinopse */}
                        {item.overview && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5"/> Resumo</h3>
                                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/40">
                                    {item.overview}
                                </p>
                            </div>
                        )}

                        {/* Seção Interativa: Avaliação e Review */}
                        <form id={`review-form-${item.id}`} onSubmit={handleSaveDetails} className="space-y-4 pt-4 border-t border-border/40">
                            <h3 className="text-sm font-bold text-foreground">Sua Avaliação e Notas</h3>
                            
                            {/* Estrelas Interativas */}
                            <div className="flex items-center gap-1 bg-muted/20 w-fit p-1 rounded-xl border border-border/40">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="p-1.5 hover:scale-110 transition-transform focus:outline-none rounded-lg hover:bg-muted"
                                    >
                                        <Star className={cn("h-6 w-6 transition-colors", rating >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                                    </button>
                                ))}
                                <span className="ml-2 pr-3 text-xs text-muted-foreground font-semibold">{rating > 0 ? `${rating}/5` : "---"}</span>
                            </div>

                            {/* Campo de Anotações/Review */}
                            <div className="space-y-2">
                                <Textarea 
                                    placeholder="Escreva sua resenha pessoal, pensamentos ou citações marcantes aqui..." 
                                    className="min-h-[120px] resize-none bg-muted/20 focus:bg-background border-border/50 rounded-xl p-4 text-sm leading-relaxed"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </form>
                    </div>
                </ScrollArea>

                {/* Rodapé Fixo do Modal */}
                <div className="p-4 md:p-6 bg-muted/10 border-t border-border/40 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-lg">Cancelar</Button>
                    <Button type="submit" form={`review-form-${item.id}`} disabled={isLoading} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 min-w-[120px] rounded-lg">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar Review
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}