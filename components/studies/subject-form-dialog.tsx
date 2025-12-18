"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createSubject, updateSubject } from "@/app/(dashboard)/studies/actions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Target,
  Gauge,
  Hash,
  Save,
  Loader2,
  FolderTree,
} from "lucide-react";

import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface Subject {
  id: string;
  title: string;
  category: string | null;
  difficulty: number;
  goalMinutes: number;
  icon?: string | null;
  parentId?: string | null;
}

interface SubjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  currentSubject?: Subject | null;
  potentialParents?: Subject[]; 
}

interface ActionResult {
  success: boolean;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "1 - Muito Fácil" },
  { value: "2", label: "2 - Fácil" },
  { value: "3", label: "3 - Padrão" },
  { value: "4", label: "4 - Difícil" },
  { value: "5", label: "5 - Expert" },
] as const;

const minutesToHours = (minutes: number) => minutes / 60;
const hoursToMinutes = (hours: number) => Math.round(hours * 60);

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export function SubjectFormDialog({
  open,
  onClose,
  currentSubject,
  potentialParents = [], 
}: SubjectFormDialogProps) {
  const isEditing = Boolean(currentSubject);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ FORM STATE ------------------------------ */
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("3");
  const [icon, setIcon] = useState("");
  const [parentId, setParentId] = useState<string>("root"); 

  const [goalMinutes, setGoalMinutes] = useState("3600");
  const [goalHours, setGoalHours] = useState(60);

  /* ------------------------------------------------------------------------ */
  /* SYNC PROPS → STATE                                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open) return;

    if (currentSubject) {
      setTitle(currentSubject.title);
      setCategory(currentSubject.category || "");
      setDifficulty(String(currentSubject.difficulty));
      setGoalMinutes(String(currentSubject.goalMinutes));
      setGoalHours(minutesToHours(currentSubject.goalMinutes));
      setIcon(currentSubject.icon ?? "");
      setParentId(currentSubject.parentId ?? "root");
    } else {
      // Reset para criação
      setTitle("");
      setCategory("");
      setDifficulty("3");
      setGoalMinutes("3600");
      setGoalHours(60);
      setIcon("");
      setParentId("root");
    }
  }, [open, currentSubject]);

  /* ------------------------------------------------------------------------ */
  /* HANDLERS                                                                 */
  /* ------------------------------------------------------------------------ */

  const handleGoalHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = Number(e.target.value); // Removemos o || 0 para permitir digitar e apagar
    const validHours = isNaN(hours) ? 0 : hours;
    
    // Permitir até 10000 horas
    const clamped = Math.min(Math.max(validHours, 0), 10000); 

    setGoalHours(clamped);
    if (clamped > 0) setGoalMinutes(String(hoursToMinutes(clamped)));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      const parsedGoalMinutes = Number(goalMinutes);

      // Validação básica
      if (!title.trim()) {
        toast.error("O nome do assunto é obrigatório.");
        setIsSubmitting(false);
        return;
      }

      if (Number.isNaN(parsedGoalMinutes) || parsedGoalMinutes <= 0) {
        toast.error("Defina uma meta de horas maior que zero.");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("category", category.trim()); 
      formData.set("difficulty", difficulty);
      formData.set("goalMinutes", String(parsedGoalMinutes));
      formData.set("icon", icon.trim());
      
      // ✅ CORREÇÃO CRÍTICA:
      // O Zod schema aceita UUID ou string vazia "". 
      // Se não enviarmos nada, o formData retorna null, que o Zod rejeita.
      if (parentId && parentId !== "root") {
        formData.set("parentId", parentId);
      } else {
        formData.set("parentId", ""); // Envia string vazia para indicar "sem pai"
      }

      if (isEditing && currentSubject) {
        formData.set("id", currentSubject.id);
      }

      const action = isEditing ? updateSubject : createSubject;
      const toastId = toast.loading(
        isEditing ? `Atualizando ${title}...` : "Criando tópico..."
      );

      try {
        const result: ActionResult = await action(formData);

        if (result.success) {
          toast.success(result.message ?? "Salvo com sucesso!", {
            id: toastId,
          });
          onClose();
        } else {
          toast.error(result.message ?? "Erro ao salvar.", {
            id: toastId,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro de conexão com o servidor.", { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      category,
      difficulty,
      goalMinutes,
      icon,
      parentId,
      isEditing,
      currentSubject,
      onClose,
    ]
  );

  // Filtra para evitar que um tópico seja pai dele mesmo
  const availableParents = potentialParents.filter(
    (p) => p.id !== currentSubject?.id
  );

  /* ------------------------------------------------------------------------ */
  /* JSX                                                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            {isEditing ? <div className="p-1 bg-primary/10 rounded"><Hash className="w-4 h-4"/></div> : <div className="p-1 bg-primary/10 rounded"><FolderTree className="w-4 h-4"/></div>}
            {isEditing
              ? `Editar: ${title}`
              : "Novo Tópico de Estudo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          
          {/* TITLE & PARENT (Hierarquia) */}
          <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Título do Tópico <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: React Query, Cálculo I, Inglês..."
                  autoFocus
                  required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                      <FolderTree className="h-3 w-3" />
                      Pertence a...
                    </Label>
                    <Select value={parentId} onValueChange={setParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um pai" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">-- Raiz (Sem pai) --</SelectItem>
                        {availableParents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.icon ? `${parent.icon} ` : ""}{parent.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Categoria (Tag)
                    </Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex: Tecnologia"
                    />
                </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* META & DIFICULDADE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <Target className="h-3 w-3" />
                Meta (Horas) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={goalHours}
                    onChange={handleGoalHoursChange}
                    className="font-bold text-primary pr-8"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">h</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                {goalMinutes} min totais
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <Gauge className="h-3 w-3" />
                Dificuldade
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ICON */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Hash className="h-3 w-3" />
              Ícone (Emoji)
            </Label>
            <div className="flex gap-2">
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="⚛️"
                  className="flex-1"
                />
                <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded border text-lg shrink-0">
                    {icon || "?"}
                </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="shadow-md shadow-primary/20 hover:bg-primary/90 min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Salvar" : "Criar Tópico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}