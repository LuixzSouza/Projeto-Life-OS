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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FlashcardItemProps {
  card: Flashcard;
  index: number;
  total: number;
  deckId: string;
}

export function FlashcardItem({ card, index, total, deckId }: FlashcardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados locais para o formulário de edição
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);

  async function handleSave() {
    setIsSaving(true);
    const formData = new FormData();
    formData.append("cardId", card.id);
    formData.append("term", term);
    formData.append("definition", definition);

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
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return;
    
    setIsDeleting(true);
    const result = await deleteCard(card.id, deckId);
    
    if (result.success) {
      toast.success("Cartão removido.");
    } else {
      toast.error("Erro ao remover.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="group relative flex flex-col sm:flex-row gap-0 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Número do Card */}
        <div className="sm:w-12 bg-muted/30 sm:border-r border-border/40 flex items-center justify-center py-2 sm:py-0 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">
          <span className="text-xs font-mono font-bold text-muted-foreground/50 group-hover:text-primary/70">
            #{(total - index).toString().padStart(2, "0")}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
          <div className="p-5 space-y-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
              Frente
            </p>
            <p className="font-medium text-foreground text-sm leading-relaxed">
              {card.term}
            </p>
          </div>

          <div className="p-5 space-y-2 bg-muted/5 group-hover:bg-muted/10 transition-colors">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors" />
              Verso
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.definition}
            </p>
          </div>
        </div>

        {/* Ações (Hover) */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur-sm p-1 rounded-lg border border-border/50 sm:border-transparent sm:bg-transparent">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => setIsEditing(true)}
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Remover"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* DIALOG DE EDIÇÃO */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar Cartão
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Frente (Termo)</Label>
              <Input 
                value={term} 
                onChange={(e) => setTerm(e.target.value)} 
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label>Verso (Definição)</Label>
              <Textarea 
                value={definition} 
                onChange={(e) => setDefinition(e.target.value)} 
                className="min-h-[100px] resize-none leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}