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
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

interface Subject {
  id: string;
  title: string;
  category: string;
  difficulty: number;
  goalMinutes: number;
  icon?: string | null;
}

interface SubjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  currentSubject?: Subject | null;
}

interface ActionResult {
  success: boolean;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
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
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function SubjectFormDialog({
  open,
  onClose,
  currentSubject,
}: SubjectFormDialogProps) {
  const isEditing = Boolean(currentSubject);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ FORM STATE ------------------------------ */
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("3");
  const [icon, setIcon] = useState("");

  const [goalMinutes, setGoalMinutes] = useState("3600");
  const [goalHours, setGoalHours] = useState(60);

  /* ------------------------------------------------------------------------ */
  /*                    SYNC PROPS → STATE (EDIT FIX)                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open) return;

    if (currentSubject) {
      setTitle(currentSubject.title);
      setCategory(currentSubject.category);
      setDifficulty(String(currentSubject.difficulty));
      setGoalMinutes(String(currentSubject.goalMinutes));
      setGoalHours(minutesToHours(currentSubject.goalMinutes));
      setIcon(currentSubject.icon ?? "");
    } else {
      setTitle("");
      setCategory("");
      setDifficulty("3");
      setGoalMinutes("3600");
      setGoalHours(60);
      setIcon("");
    }
  }, [open, currentSubject]);

  /* ------------------------------------------------------------------------ */
  /*                                HANDLERS                                  */
  /* ------------------------------------------------------------------------ */

  const handleGoalHoursChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const hours = Number(e.target.value) || 0;
    const clamped = Math.min(Math.max(hours, 1), 1000);

    setGoalHours(clamped);
    setGoalMinutes(String(hoursToMinutes(clamped)));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      const parsedGoalMinutes = Number(goalMinutes);

      if (
        !title.trim() ||
        !category.trim() ||
        Number.isNaN(parsedGoalMinutes) ||
        parsedGoalMinutes <= 0
      ) {
        toast.error("Preencha corretamente todos os campos.");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.set("title", title);
      formData.set("category", category);
      formData.set("difficulty", difficulty);
      formData.set("goalMinutes", goalMinutes);
      formData.set("icon", icon);

      if (isEditing && currentSubject) {
        formData.set("id", currentSubject.id);
      }

      const action = isEditing ? updateSubject : createSubject;
      const toastId = toast.loading(
        isEditing ? `Atualizando ${title}...` : "Criando nodo..."
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
      } catch {
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
      isEditing,
      currentSubject,
      onClose,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /*                                   JSX                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {isEditing
              ? `Editar: ${title}`
              : "Criar Novo Nodo de Conhecimento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-6">
          {/* TITLE + CATEGORY */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Nome do Assunto
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: React Query"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Nodo Pai (Categoria)
              </Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Front-end"
              />
            </div>
          </div>

          {/* DIFFICULTY + GOAL */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <Target className="h-3 w-3" />
                Meta (Horas)
              </Label>
              <Input
                type="number"
                min={1}
                value={goalHours}
                onChange={handleGoalHoursChange}
                className="font-bold text-primary"
              />
              <p className="text-[10px] text-muted-foreground text-right">
                Convertido: {goalMinutes} minutos
              </p>
            </div>
          </div>

          {/* ICON */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Hash className="h-3 w-3" />
              Ícone (opcional)
            </Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="⚛️"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="shadow-md shadow-primary/20 hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Salvar Alterações" : "Adicionar ao Mapa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
