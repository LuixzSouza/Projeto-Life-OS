"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Plus, Film, Music, Gamepad2, X, Check, ImageOff, BookOpen, Dices, Settings, AlertTriangle } from "lucide-react";
import { searchMedia, discoverRandomMedia, getMediaProviderStatus, addMediaItem, type SearchResult, type MediaType } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Tipagem estrita para o parâmetro que a API espera
type ApiSearchType = "VIDEO" | "MUSIC" | "GAME" | "BOOK";

// Converte a aba (MediaType) para o tipo que as APIs esperam.
const apiTypeFor = (t: MediaType): ApiSearchType =>
  t === "ALBUM" ? "MUSIC" : t === "GAME" ? "GAME" : t === "BOOK" ? "BOOK" : "VIDEO";

export function AddMediaDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MediaType>("MOVIE");
  const [providers, setProviders] = useState<{ tmdb: boolean; rawg: boolean; googleBooks: boolean } | null>(null);
  const [discovered, setDiscovered] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Provedor que exige chave e está faltando para a aba atual (conexão com Settings).
  const missingProvider: "TMDB" | "RAWG" | null =
    !providers ? null
    : (activeTab === "MOVIE" || activeTab === "TV_SHOW") && !providers.tmdb ? "TMDB"
    : activeTab === "GAME" && !providers.rawg ? "RAWG"
    : null;

  // Limpa os estados ao fechar o modal, com delay para não piscar a tela
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setResults([]);
        setQuery("");
        setDiscovered(false);
      }, 300);
    }
  };

  // Auto-focus no input quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Verifica quais provedores (TMDB/RAWG) estão configurados nas Configurações
  useEffect(() => {
    if (isOpen && !providers) {
      getMediaProviderStatus().then(setProviders).catch(() => {});
    }
  }, [isOpen, providers]);

  // Descoberta aleatória ("Surpreenda-me") respeitando a aba ativa
  async function handleDiscover() {
    setIsLoadingSearch(true);
    setResults([]);
    setDiscovered(true);
    try {
      const { results: found, missingKey } = await discoverRandomMedia(apiTypeFor(activeTab));
      if (missingKey) {
        const label = missingKey === "googleBooks" ? "Google Books" : missingKey.toUpperCase();
        toast.error(`Cota esgotada — conecte sua chave ${label} nas Configurações para continuar.`);
        setResults([]);
      } else {
        setResults(found);
        if (found.length === 0) toast.info("Nada encontrado agora. Tente de novo!");
      }
    } catch (error) {
      console.error("Discover error:", error);
      toast.error("Erro ao descobrir. Tente novamente.");
    } finally {
      setIsLoadingSearch(false);
    }
  }

  async function handleSearch(overrideType?: MediaType) {
    if (!query.trim()) return;

    setIsLoadingSearch(true);
    setResults([]);
    setDiscovered(false);

    const apiType = apiTypeFor(overrideType || activeTab);

    try {
      const data = await searchMedia(query, apiType);
      setResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Ocorreu um erro ao buscar os resultados.");
      setResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }

  const handleTabChange = (val: string) => {
    const newTab = val as MediaType;
    setActiveTab(newTab);
    setDiscovered(false);
    if (query.trim()) {
      handleSearch(newTab);
    } else {
      setResults([]);
    }
  };

  async function handleSave(item: SearchResult) {
    // Trava para evitar cliques duplos rápidos
    if (isSavingId) return;
    
    setIsSavingId(item.id);

    try {
      const result = await addMediaItem(item);
      
      if (result.success) {
        toast.success(
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span><span className="font-bold">{item.title}</span> adicionado!</span>
          </div>
        );
        handleOpenChange(false);
      } else {
        toast.error(result?.message || "Não foi possível salvar a obra.");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Erro de conexão ao tentar salvar.");
    } finally {
      setIsSavingId(null);
    }
  }

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  // Placeholders amigáveis baseados na aba atual
  const getPlaceholder = () => {
    switch (activeTab) {
        case "GAME": return "Ex: The Witcher 3, Cyberpunk 2077...";
        case "ALBUM": return "Ex: Pink Floyd, Daft Punk, The Weeknd...";
        case "BOOK": return "Ex: Hábitos Atômicos, 1984, Duna...";
        default: return "Ex: Interestelar, Matrix, Breaking Bad...";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-foreground text-background hover:bg-foreground/90 shadow-md gap-2 font-semibold rounded-lg h-10 px-4">
          <Plus className="h-4 w-4" /> Buscar Obras
        </Button>
      </DialogTrigger>

      <DialogContent size="xl" className="p-0 gap-0">
        <div className="p-6 pb-4 bg-muted/10 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl">Explorar Catálogo</DialogTitle>
            <DialogDescription>Busque na base global (TMDB, RAWG, Google Books, iTunes).</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="MOVIE" value={activeTab} onValueChange={handleTabChange} className="w-full mt-5">
            <TabsList className="flex w-full h-11 bg-background border border-border/50 shadow-sm rounded-xl p-1 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="MOVIE" className="flex-1 rounded-lg text-xs font-semibold"><Film className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Filmes/Séries</span></TabsTrigger>
              <TabsTrigger value="GAME" className="flex-1 rounded-lg text-xs font-semibold"><Gamepad2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Jogos</span></TabsTrigger>
              <TabsTrigger value="ALBUM" className="flex-1 rounded-lg text-xs font-semibold"><Music className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Álbuns</span></TabsTrigger>
              <TabsTrigger value="BOOK" className="flex-1 rounded-lg text-xs font-semibold"><BookOpen className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Livros</span></TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative mt-4 flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder={getPlaceholder()}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 pr-10 h-12 bg-background border-border/50 focus:border-primary/50 transition-all text-base rounded-xl shadow-sm"
                />
                {query && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full transition-colors">
                    <X className="h-4 w-4" />
                </button>
                )}
            </div>
            <Button onClick={() => handleSearch()} disabled={isLoadingSearch || !query.trim()} className="h-12 px-6 rounded-xl shadow-sm">
              {isLoadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscover}
              disabled={isLoadingSearch}
              title="Descobrir algo aleatório para esta categoria"
              className="h-12 px-4 rounded-xl shadow-sm gap-2 shrink-0 text-primary border-primary/30 hover:bg-primary/10"
            >
              <Dices className="h-4 w-4" /> <span className="hidden sm:inline">Surpreenda-me</span>
            </Button>
          </div>

          {/* Aviso: chave do provedor faltando (conexão com Settings) */}
          {missingProvider && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Configure sua chave <strong>{missingProvider}</strong> para buscar nesta categoria.</span>
              <Link href="/settings" onClick={() => setIsOpen(false)} className="font-bold underline inline-flex items-center gap-1 shrink-0">
                <Settings className="h-3 w-3" /> Configurações
              </Link>
            </div>
          )}
        </div>

        {/* ÁREA DE RESULTADOS */}
        <ScrollArea className="h-[450px] bg-background p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 pr-4">
            
            {/* Skeletons (Carregamento Seguro) */}
            {isLoadingSearch && Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="space-y-3">
                  <Skeleton className={cn("w-full rounded-xl", activeTab === "GAME" ? "aspect-video" : activeTab === "ALBUM" ? "aspect-square" : "aspect-[2/3]")} />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
            ))}

            {/* Renderização da Lista */}
            {!isLoadingSearch && results.map((item) => {
                const isSavingThis = isSavingId === item.id;
                const aspectRatioClass = item.type === "GAME" ? "aspect-video" : item.type === "ALBUM" ? "aspect-square" : "aspect-[2/3]";

                return (
                  <div 
                    key={`result-${item.id}`} 
                    onClick={() => handleSave(item)} 
                    className={cn(
                        "group relative rounded-xl overflow-hidden border border-border/40 cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 flex flex-col bg-card", 
                        isSavingThis && "opacity-50 pointer-events-none"
                    )}
                  >
                    
                    <div className={cn("relative bg-muted/40 shrink-0 border-b border-border/20", aspectRatioClass)}>
                      {item.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.coverUrl} alt={item.title} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                          <ImageOff className="h-6 w-6 opacity-20" />
                        </div>
                      )}

                      <div className={cn("absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] transition-all duration-300", isSavingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        {isSavingThis ? (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : (
                          <div className="bg-primary text-primary-foreground rounded-full p-2.5 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                            <Plus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-background flex flex-col justify-start flex-1">
                        <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight" title={item.title}>{item.title}</h4>
                        
                        <div className="mt-1.5 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground truncate flex-1 pr-2">
                                {item.creator || (item.type === "BOOK" ? "Autor Desconhecido" : "Desconhecido")}
                            </p>
                            <span className="text-[10px] font-bold text-muted-foreground shrink-0">{item.releaseYear || ""}</span>
                        </div>
                    </div>
                  </div>
                );
            })}
          </div>

          {/* ESTADOS VAZIOS */}
          {!isLoadingSearch && results.length === 0 && (query || discovered) && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-semibold text-foreground">Nenhum resultado encontrado.</p>
              <p className="text-sm mt-1 max-w-xs">Verifique a ortografia, tente o nome original (em inglês) ou descubra algo novo.</p>

              {/* Livros: API gratuita sem chave pode estourar a cota — sugere conectar. */}
              {activeTab === "BOOK" && providers && !providers.googleBooks && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 max-w-sm">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">Sem resultados pode ser limite de cota. Conecte uma chave <strong>Google Books</strong> (gratuita).</span>
                  <Link href="/settings" onClick={() => setIsOpen(false)} className="font-bold underline inline-flex items-center gap-1 shrink-0">
                    <Settings className="h-3 w-3" /> Conectar
                  </Link>
                </div>
              )}

              <Button variant="outline" onClick={handleDiscover} className="mt-5 gap-2 rounded-xl text-primary border-primary/30 hover:bg-primary/10">
                <Dices className="h-4 w-4" /> Surpreenda-me
              </Button>
            </div>
          )}

          {!isLoadingSearch && results.length === 0 && !query && !discovered && (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center">
              <Dices className="h-12 w-12 mb-4 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Busque pelo nome ou descubra algo novo.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Sem ideias do que assistir, jogar, ouvir ou ler? Deixe o sistema sugerir.</p>
              <Button onClick={handleDiscover} className="mt-5 gap-2 rounded-xl shadow-sm">
                <Dices className="h-4 w-4" /> Surpreenda-me
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}