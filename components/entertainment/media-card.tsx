"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, MoreVertical, Star, Calendar, User, AlignLeft, Loader2, ImageOff, Eye, Tag } from "lucide-react";
import { deleteMediaItem, updateMediaStatus, updateMediaDetails } from "@/app/(dashboard)/entertainment/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, STATUS_CONFIG, type MediaItemData } from "./entertainment-config";
import { EntityTags } from "@/components/connect/entity-tags";
import { EntityAttachments } from "@/components/connect/entity-attachments";
import { EntityLinks } from "@/components/connect/entity-links";

const aspectByType = (type: string) =>
  type === "GAME" ? "aspect-video" :
  type === "ALBUM" ? "aspect-square" :
  "aspect-[2/3]";

export function MediaCard({ item }: { item: MediaItemData }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [rating, setRating] = useState(item.rating || 0);
  const [notes, setNotes] = useState(item.notes || "");
  const [status, setStatus] = useState(item.status);

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.MOVIE;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLAN_TO_WATCH;
  const Icon = config.icon;
  const aspectRatioClass = aspectByType(item.type);

  const genreList = item.genres ? item.genres.split(",").map(g => g.trim()).filter(Boolean) : [];

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
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
      <div className="group relative flex flex-col h-full">

        {/* ÁREA DA IMAGEM (Clicável para abrir Detalhes) */}
        <div
          onClick={() => setIsDetailsOpen(true)}
          className={cn(
            "relative overflow-hidden rounded-xl bg-muted/40 shrink-0 cursor-pointer shadow-sm border border-border/40 transition-all duration-300",
            "group-hover:border-primary/40 group-hover:shadow-lg group-hover:-translate-y-1",
            aspectRatioClass
          )}
        >
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/30"><Icon className="h-10 w-10" /></div>
          )}

          {/* Overlay no hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white">
              <Eye className="h-3.5 w-3.5" /> Ver detalhes
            </span>
          </div>

          {/* Sombra de leitura no topo */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

          {/* Badge de Status */}
          <div className={cn("absolute top-2 left-2 px-1.5 py-1 rounded-md text-[10px] uppercase font-bold flex items-center gap-1 shadow-sm backdrop-blur-md", statusCfg.bg, statusCfg.color)}>
            <statusCfg.icon className="h-3 w-3" />
          </div>

          {/* Nota (estrelas) sobre a capa */}
          {rating > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-bold text-white">{rating}.0</span>
            </div>
          )}

          {/* MENU DE OPÇÕES */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 bg-black/50 hover:bg-black/80 text-white rounded-md backdrop-blur-sm border border-white/10">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Mover para...</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={status} onValueChange={handleStatusChange}>
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
        </div>

        {/* ÁREA DE TEXTO */}
        <div className="pt-3 pb-1 px-1 flex-1 flex flex-col justify-start">
          <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight" title={item.title}>{item.title}</h4>
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

      {/* 2. O MODAL DE DETALHES (Cinematográfico) */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[96vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden bg-background border-border/60 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>Detalhes e review da obra</DialogDescription>
          </DialogHeader>

          {/* BANNER: capa desfocada + poster + título */}
          <div className="relative shrink-0 overflow-hidden">
            {item.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.coverUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-40" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />

            <div className="relative flex items-end gap-4 p-6 pt-10">
              {/* Poster */}
              <div className={cn("w-24 sm:w-28 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-muted", aspectRatioClass)}>
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full"><ImageOff className="h-8 w-8 text-muted-foreground/30" /></div>
                )}
              </div>

              {/* Título e meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none"><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                  {item.releaseYear && <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 bg-background/50"><Calendar className="h-3 w-3 mr-1" />{item.releaseYear}</Badge>}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-foreground line-clamp-2">{item.title}</h2>
                {item.creator && <p className="text-muted-foreground text-xs sm:text-sm mt-1 flex items-center gap-1.5 truncate"><User className="h-3.5 w-3.5 shrink-0" /> {item.creator}</p>}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pt-4 space-y-6">

              {/* Troca rápida de status */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleStatusChange(k)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-all",
                      status === k ? v.activeClass : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <v.icon className="h-3.5 w-3.5" /> {v.label}
                  </button>
                ))}
              </div>

              {/* Gêneros */}
              {genreList.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Gêneros</h3>
                  <div className="flex flex-wrap gap-2">
                    {genreList.map((g, i) => (
                      <Badge key={i} variant="secondary" className="px-2.5 py-1 bg-muted/40 text-foreground/80 border border-border/40 font-medium">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sinopse */}
              {item.overview && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5" /> Resumo</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/40">
                    {item.overview}
                  </p>
                </div>
              )}

              {/* Avaliação e Review */}
              <form id={`review-form-${item.id}`} onSubmit={handleSaveDetails} className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-sm font-bold text-foreground">Sua Avaliação e Notas</h3>

                <div className="flex items-center gap-1 bg-muted/20 w-fit p-1 rounded-xl border border-border/40">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star === rating ? 0 : star)}
                      className="p-1.5 hover:scale-110 transition-transform focus:outline-none rounded-lg hover:bg-muted"
                    >
                      <Star className={cn("h-6 w-6 transition-colors", rating >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    </button>
                  ))}
                  <span className="ml-2 pr-3 text-xs text-muted-foreground font-semibold">{rating > 0 ? `${rating}/5` : "---"}</span>
                </div>

                <Textarea
                  placeholder="Escreva sua resenha pessoal, pensamentos ou citações marcantes aqui..."
                  className="min-h-[120px] resize-none bg-muted/20 focus:bg-background border-border/50 rounded-xl p-4 text-sm leading-relaxed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </form>

              {/* Tags, Anexos & Relações (tecido conectivo cross-módulo) */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Tags, Anexos & Relações
                </h3>
                <EntityTags entityType="media" entityId={item.id} />
                <EntityAttachments entityType="media" entityId={item.id} />
                <EntityLinks entityType="media" entityId={item.id} />
              </div>
            </div>
          </ScrollArea>

          {/* Rodapé Fixo */}
          <div className="p-4 md:p-5 bg-muted/10 border-t border-border/40 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button type="submit" form={`review-form-${item.id}`} disabled={isLoading} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 min-w-[120px] rounded-lg">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
