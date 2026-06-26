"use client";

import { useState } from "react";
import { Flashcard } from "@prisma/client";
import { updateCard, deleteCard } from "@/app/(dashboard)/flashcards/actions";
import { toast } from "sonner";

import {
  Trash2,
  Edit2,
  Loader2,
  Save,
  AlertTriangle,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePaster } from "@/components/ui/image-paster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FlashcardItemProps {
  card: Flashcard;
  index: number;
  total: number;
  deckId: string;
}

export function FlashcardItem({ card, index, total, deckId }: FlashcardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Lightbox: ver a imagem da frente em tamanho grande (útil p/ cartões só-imagem).
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Estados locais para o formulário de edição
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [hint, setHint] = useState<string>(card.hint ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(card.imageUrl);

  async function handleSave() {
    setIsSaving(true);
    const formData = new FormData();
    formData.append("cardId", card.id);
    formData.append("term", term);
    formData.append("definition", definition);
    formData.append("hint", hint);
    formData.append("image", imageUrl ?? "");

    const result = await updateCard(deckId, formData);

    if (result.success) {
      toast.success("Cartão atualizado!");
      setIsEditing(false);
    } else {
      toast.error(result.message);
    }
    setIsSaving(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteCard(card.id, deckId);
    
    if (result.success) {
      toast.success("Cartão removido permanentemente.");
      setIsDeleteDialogOpen(false);
    } else {
      toast.error("Erro ao remover o cartão.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="group relative flex flex-col md:flex-row gap-0 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden mt-4 animate-in fade-in slide-in-from-top-2">
        
        {/* NÚMERO DO CARD */}
        <div className="md:w-16 bg-muted/40 md:border-r border-b md:border-b-0 border-border/40 flex items-center justify-center py-3 md:py-0 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20 shrink-0">
          <span className="text-sm font-mono font-bold text-muted-foreground/60 group-hover:text-primary/80 transition-colors">
            #{(total - index).toString().padStart(2, "0")}
          </span>
        </div>

        {/* CONTEÚDO (FRENTE E VERSO) */}
        <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
          
          {/* FRENTE */}
          <div className="p-6 md:p-8 space-y-4 bg-background/50">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all" />
              Pergunta
            </p>
            {card.term && (
              <p className="font-semibold text-foreground text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {card.term}
              </p>
            )}
            {card.imageUrl && (
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                title="Clique para ampliar"
                aria-label="Ampliar imagem do cartão"
                className="group/img relative mt-1 block w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20 transition-colors hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- base64 local (images.unoptimized), next/image não otimiza */}
                <img
                  src={card.imageUrl}
                  alt="Imagem do cartão"
                  className={cn(
                    "mx-auto w-auto max-w-full object-contain transition-transform duration-300 group-hover/img:scale-[1.02]",
                    // Só-imagem (sem texto na frente) vira o destaque → maior.
                    card.term ? "max-h-56" : "max-h-80",
                  )}
                />
                <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/img:opacity-100">
                  <Maximize2 className="h-3 w-3" /> Ampliar
                </span>
              </button>
            )}
          </div>

          {/* VERSO */}
          <div className="p-6 md:p-8 space-y-4 bg-muted/20 group-hover:bg-muted/40 transition-colors">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all" />
              Resposta
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {card.definition}
            </p>
          </div>
        </div>

        {/* AÇÕES NO HOVER (Desktop) / SEMPRE VISÍVEIS (Mobile) */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-border/50 md:border-border/30 shadow-sm">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
            onClick={() => setIsEditing(true)}
            title="Editar Cartão"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            onClick={() => setIsDeleteDialogOpen(true)}
            title="Remover Cartão"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* DIALOG DE EDIÇÃO */}
      {/* -------------------------------------------------------- */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent size="lg">
          <DialogHeader icon={<Edit2 />} title={`Editar cartão #${(total - index).toString().padStart(2, "0")}`} />

          <DialogBody className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frente (Pergunta ou imagem)</Label>
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Deixe em branco para usar só a imagem"
                className="font-semibold text-base h-12 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verso (Resposta Detalhada)</Label>
              <Textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                className="min-h-[160px] resize-none leading-relaxed text-base bg-muted/20 border-border/60 focus-visible:ring-primary/30 p-4"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dica (opcional)</Label>
              <Input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Uma pista que ajuda a lembrar — aparece na frente sob demanda"
                maxLength={500}
                className="text-base h-12 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Mostrada na frente do cartão quando você tocar em <strong>Dica</strong> — sem revelar a resposta.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem (opcional)</Label>
              <ImagePaster defaultValue={imageUrl} onImageChange={setImageUrl} />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="hover:bg-muted/50">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="shadow-lg shadow-primary/20 min-w-[140px] font-bold">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------- */}
      {/* LIGHTBOX: imagem da frente em tamanho grande              */}
      {/* -------------------------------------------------------- */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent size="xl" className="bg-background/95 p-0">
          <DialogTitle className="sr-only">
            Imagem do cartão #{(total - index).toString().padStart(2, "0")}
          </DialogTitle>
          <div className="flex max-h-[90dvh] items-center justify-center p-4 sm:p-6">
            {card.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- base64 local (images.unoptimized)
              <img
                src={card.imageUrl}
                alt="Imagem do cartão ampliada"
                className="max-h-[82dvh] w-auto max-w-full rounded-xl object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------- */}
      {/* ALERT DE EXCLUSÃO SEGURO */}
      {/* -------------------------------------------------------- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-destructive/30 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <AlertTriangle className="h-6 w-6" /> Remover Cartão?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80 mt-2">
              Tem certeza que deseja deletar este flashcard? Esta ação não pode ser desfeita e você perderá o histórico de aprendizado desta carta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 min-w-[120px]"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}