"use client";

import { useState } from "react";
import { StudySubject } from "@prisma/client";
import { createDeck } from "@/app/(dashboard)/flashcards/actions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Loader2 } from "lucide-react";

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: StudySubject[];
}

export function CreateDeckDialog({ open, onOpenChange, subjects }: CreateDeckDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setSelectedSubjectId("none");
  };

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject && !title) {
      setTitle(subject.title); // Sugere o nome da matéria para facilitar
    }
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return toast.error("O título é obrigatório.");

    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);

    if (selectedSubjectId !== "none") {
      formData.set("subjectId", selectedSubjectId);
    }

    const toastId = toast.loading("Criando baralho...");
    const result = await createDeck(formData);

    if (result.success) {
      toast.success(result.message, { id: toastId });
      onOpenChange(false);
      reset();
    } else {
      toast.error(result.message, { id: toastId });
    }
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
    }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold rounded-xl h-12">
          <Plus className="h-5 w-5" />
          Novo Baralho
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md border-border/60 shadow-2xl rounded-2xl overflow-hidden p-0">
        <div className="bg-muted/10 p-6 border-b border-border/40">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Layers className="h-5 w-5" />
                </div>
                Criar Baralho
            </DialogTitle>
            <DialogDescription>
                Agrupe seus cartões de estudo por tema ou matéria.
            </DialogDescription>
            </DialogHeader>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5 bg-background">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título <span className="text-destructive">*</span></Label>
            <Input
              name="title"
              placeholder="Ex: Vocabulário Inglês, Fórmulas de Física..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 font-medium bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matéria Vinculada</Label>
            <Select value={selectedSubjectId} onValueChange={handleSubjectSelect}>
              <SelectTrigger className="h-11 bg-muted/20">
                <SelectValue placeholder="Vincular a uma matéria existente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="font-semibold text-primary">-- Sem vínculo (Isolado) --</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.icon ? `${s.icon} ` : ""}{s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Selecione uma matéria para herdar o ícone e a cor.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Curta (Opcional)</Label>
            <Textarea
              name="description"
              placeholder="Para que serve este baralho?"
              className="resize-none h-24 bg-muted/20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()} className="shadow-lg shadow-primary/20 min-w-[120px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Baralho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
