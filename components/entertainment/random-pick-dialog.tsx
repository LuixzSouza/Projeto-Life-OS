"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dices, Sparkles, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, type MediaItemData } from "./entertainment-config";

interface RandomPickDialogProps {
  item: MediaItemData | null;
  onClose: () => void;
  onReroll: () => void;
}

export function RandomPickDialog({ item, onClose, onReroll }: RandomPickDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm text-center border-border shadow-2xl rounded-3xl overflow-hidden p-0">
        <div className="bg-gradient-to-b from-primary/10 to-background p-8 pt-10 relative">
            <div className="absolute top-4 right-4 text-primary opacity-50"><Sparkles className="h-6 w-6"/></div>
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center gap-2 text-2xl font-bold">Sua Sessão de Hoje</DialogTitle>
              <DialogDescription className="text-muted-foreground">O destino escolheu esta obra para você.</DialogDescription>
            </DialogHeader>

            {item && (
              <div className="mt-8 flex flex-col items-center">
                {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt={item.title} className={cn("rounded-xl shadow-lg border border-border/50 mb-5 object-cover", item.type === "ALBUM" ? "w-40 aspect-square" : item.type === "GAME" ? "w-48 aspect-video" : "w-32 aspect-[2/3]")} />
                ) : (
                    <div className="w-32 aspect-[2/3] bg-muted rounded-xl mb-5 flex items-center justify-center"><Clapperboard className="h-8 w-8 text-muted-foreground/30"/></div>
                )}
                <h3 className="font-extrabold text-xl leading-tight line-clamp-2 px-4">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{item.releaseYear || "Ano desconhecido"}</p>

                <Badge className="mt-3 bg-primary/10 text-primary shadow-none border-none">
                  {TYPE_CONFIG[item.type]?.label || "Mídia"}
                </Badge>
              </div>
            )}
        </div>
        <DialogFooter className="flex gap-2 p-4 bg-muted/10 border-t border-border/50">
          <Button variant="ghost" onClick={onReroll} className="flex-1 bg-background hover:bg-muted shadow-sm"><Dices className="h-4 w-4 mr-2"/> Rodar de novo</Button>
          <Button onClick={onClose} className="flex-1 shadow-lg">Vou consumir!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
