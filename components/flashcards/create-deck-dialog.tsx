"use client";

import { useState } from "react";
import { StudySubject } from "@prisma/client";
import { createDeck } from "@/app/(dashboard)/flashcards/actions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTrigger, DialogBody, DialogFooter,
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

      <DialogContent size="md">
        <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader
            icon={<Layers />}
            title="Criar baralho"
            description="Agrupe seus cartões de estudo por tema ou matéria."
          />

          <DialogBody className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título <span className="text-destructive">*</span></Label>
              <Input
                name="title"
                placeholder="Ex: Vocabulário Inglês, Fórmulas de Física..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 bg-muted/20 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matéria vinculada</Label>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição curta (opcional)</Label>
              <Textarea
                name="description"
                placeholder="Para que serve este baralho?"
                className="h-24 resize-none bg-muted/20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()} className="min-w-[120px] shadow-sm">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar baralho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
