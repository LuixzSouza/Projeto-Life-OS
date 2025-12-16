"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  Plus,
  Film,
  Music,
  Gamepad2,
  X,
  Check,
  ImageOff,
} from "lucide-react";
import {
  searchMedia,
  addMediaItem,
  type SearchResult,
  type MediaType,
} from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

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
      setTimeout(() => {
        setResults([]);
        setQuery("");
      }, 300);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
      toast.error("Erro ao salvar o item.");
    }

    setIsSavingId(null);
  }

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case "GAME":
        return "Ex: The Witcher 3, Zelda, Cyberpunk...";
      case "ALBUM":
        return "Ex: Pink Floyd, Daft Punk...";
      default:
        return "Ex: Interestelar, Matrix...";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 font-semibold"
        >
          <Plus className="h-5 w-5" /> Adicionar novo
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-border">
        <div className="p-6 pb-4 bg-muted/40 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Adicionar à coleção
            </DialogTitle>
            <DialogDescription>
              Busque e salve seus favoritos rapidamente.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="MOVIE"
            onValueChange={handleTabChange}
            className="w-full mt-4"
          >
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="MOVIE">
                <Film className="h-4 w-4 mr-2" /> Filmes / TV
              </TabsTrigger>
              <TabsTrigger value="GAME">
                <Gamepad2 className="h-4 w-4 mr-2" /> Jogos
              </TabsTrigger>
              <TabsTrigger value="ALBUM">
                <Music className="h-4 w-4 mr-2" /> Álbuns
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={getPlaceholder()}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 pr-10 h-11"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex justify-end mt-3">
            <Button
              onClick={() => handleSearch()}
              disabled={isLoadingSearch || !query.trim()}
              size="sm"
            >
              {isLoadingSearch && (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              )}
              Pesquisar
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[380px] bg-background p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isLoadingSearch &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}

            {!isLoadingSearch &&
              results.map((item) => {
                const isSavingThis = isSavingId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSave(item)}
                    className={`group relative rounded-xl overflow-hidden border border-border cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                      isSavingThis ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="relative aspect-[2/3] bg-muted">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                          <ImageOff className="h-8 w-8" />
                          <span className="text-[10px] uppercase font-semibold">
                            Sem imagem
                          </span>
                        </div>
                      )}

                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                          isSavingThis
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isSavingThis ? (
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        ) : (
                          <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                            <Plus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-background border-t border-border">
                      <p
                        className="font-semibold truncate text-sm"
                        title={item.title}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}

            {!isLoadingSearch && results.length === 0 && query && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <p>Nenhum resultado encontrado.</p>
                <p className="text-xs mt-1">
                  Tente outro termo ou categoria.
                </p>
              </div>
            )}

            {!isLoadingSearch && results.length === 0 && !query && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground/70">
                <Search className="h-10 w-10 mb-3" />
                <p className="text-sm">
                  Digite acima para iniciar uma busca.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
