"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Plus, Film, Music, Gamepad2, X, Check, ImageOff } from "lucide-react";
import { searchMedia, addMediaItem, type SearchResult, type MediaType } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // 🟢 IMPORTAÇÃO CORRIGIDA

export function AddMediaDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MediaType>("MOVIE");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => { setResults([]); setQuery(""); }, 300);
    }
  };

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  async function handleSearch(overrideType?: MediaType) {
    if (!query.trim()) return;

    setIsLoadingSearch(true);
    setResults([]);

    let apiType: "VIDEO" | "MUSIC" | "GAME" = "VIDEO";
    const typeToSearch = overrideType || activeTab;

    if (typeToSearch === "ALBUM") apiType = "MUSIC";
    else if (typeToSearch === "GAME") apiType = "GAME";

    const data = await searchMedia(query, apiType);
    setResults(data);
    setIsLoadingSearch(false);
  }

  const handleTabChange = (val: string) => {
    const newTab = val as MediaType;
    setActiveTab(newTab);
    if (query) handleSearch(newTab);
    else setResults([]);
  };

  async function handleSave(item: SearchResult) {
    if (isSavingId) return;
    setIsSavingId(item.id);

    const result = await addMediaItem(item);

    if (result.success) {
      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" />
          <span className="font-semibold">{item.title}</span> salvo na coleção
        </div>
      );
      handleOpenChange(false);
    } else {
      toast.error(result?.message || "Erro ao salvar o item.");
    }

    setIsSavingId(null);
  }

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 font-semibold rounded-xl">
          <Plus className="h-5 w-5" /> Buscar Obras
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden border-border/60 shadow-2xl rounded-2xl">
        <div className="p-6 pb-4 bg-muted/20 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Explorar Catálogo</DialogTitle>
            <DialogDescription>Busque na base global do TMDB, RAWG e iTunes.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="MOVIE" onValueChange={handleTabChange} className="w-full mt-5">
            <TabsList className="grid w-full grid-cols-3 h-11 bg-background border border-border/50 shadow-sm rounded-xl p-1">
              <TabsTrigger value="MOVIE" className="rounded-lg text-xs"><Film className="h-4 w-4 mr-2" /> Filmes/Séries</TabsTrigger>
              <TabsTrigger value="GAME" className="rounded-lg text-xs"><Gamepad2 className="h-4 w-4 mr-2" /> Jogos</TabsTrigger>
              <TabsTrigger value="ALBUM" className="rounded-lg text-xs"><Music className="h-4 w-4 mr-2" /> Álbuns</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative mt-5 flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                ref={inputRef}
                placeholder={activeTab === "GAME" ? "Ex: The Witcher 3, Cyberpunk..." : activeTab === "ALBUM" ? "Ex: Pink Floyd, Daft Punk..." : "Ex: Interestelar, Matrix..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 pr-10 h-12 bg-background border-border/50 focus:border-primary/50 transition-all text-base rounded-xl shadow-sm"
                />
                {query && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full transition-colors">
                    <X className="h-4 w-4" />
                </button>
                )}
            </div>
            <Button onClick={() => handleSearch()} disabled={isLoadingSearch || !query.trim()} className="h-12 px-6 rounded-xl shadow-md">
              {isLoadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pesquisar"}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[450px] bg-background p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pr-4">
            {isLoadingSearch && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
            ))}

            {!isLoadingSearch && results.map((item) => {
                const isSavingThis = isSavingId === item.id;
                return (
                  <div key={item.id} onClick={() => handleSave(item)} className={cn("group relative rounded-xl overflow-hidden border border-border/50 cursor-pointer transition-all hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 flex flex-col bg-card", isSavingThis && "opacity-60 pointer-events-none")}>
                    
                    {/* Imagem */}
                    <div className={cn("relative bg-muted", item.type === "GAME" ? "aspect-video" : item.type === "ALBUM" ? "aspect-square" : "aspect-[2/3]")}>
                      {item.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.coverUrl} alt={item.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                          <ImageOff className="h-8 w-8 opacity-20" />
                        </div>
                      )}

                      {/* Hover Add Icon */}
                      <div className={cn("absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-300", isSavingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        {isSavingThis ? (
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        ) : (
                          <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                            <Plus className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Textos */}
                    <div className="p-3.5 bg-background border-t border-border/30 flex flex-col justify-between flex-1">
                      <div>
                          <h4 className="font-bold truncate text-sm" title={item.title}>{item.title}</h4>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.creator || "Desconhecido"}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary bg-primary/5">{item.type}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground">{item.releaseYear || ""}</span>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>

          {!isLoadingSearch && results.length === 0 && query && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium text-foreground">Nenhum resultado encontrado.</p>
              <p className="text-sm mt-1">Verifique a ortografia ou tente outro termo.</p>
            </div>
          )}

          {!isLoadingSearch && results.length === 0 && !query && (
            <div className="h-full flex flex-col items-center justify-center py-24 text-muted-foreground/50">
              <Film className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-sm font-medium">Digite o nome da obra acima para começar.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}