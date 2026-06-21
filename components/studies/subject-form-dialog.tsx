"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createSubject, updateSubject } from "@/app/(dashboard)/studies/actions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Target,
  Gauge,
  Save,
  Loader2,
  FolderTree,
  Hash as HashIcon,
  Palette,
  Check
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectCombobox } from "./subject-combobox";

interface Subject {
  id: string;
  title: string;
  category: string | null;
  difficulty: number;
  goalMinutes: number;
  icon?: string | null;
  parentId?: string | null;
  color?: string | null;
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

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "1 - Iniciante" },
  { value: "2", label: "2 - Fácil" },
  { value: "3", label: "3 - Intermediário" },
  { value: "4", label: "4 - Difícil" },
  { value: "5", label: "5 - Expert" },
] as const;

// PALETA DE CORES VIBRANTES PARA MATÉRIAS
const SUBJECT_COLORS = [
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#8b5cf6", name: "Roxo" },
  { hex: "#ec4899", name: "Rosa" },
  { hex: "#ef4444", name: "Vermelho" },
  { hex: "#f59e0b", name: "Laranja" },
  { hex: "#10b981", name: "Esmeralda" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#64748b", name: "Ardósia" },
];

const minutesToHours = (minutes: number) => minutes / 60;
const hoursToMinutes = (hours: number) => Math.round(hours * 60);

// Texto legível (preto/branco) sobre uma cor de fundo — corrige o botão de
// salvar, que tinha `text-white` fixo e sumia em cores claras (âmbar, teal).
function readableTextOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

export function SubjectFormDialog({
  open,
  onClose,
  currentSubject,
  potentialParents = [],
}: SubjectFormDialogProps) {
  const isEditing = Boolean(currentSubject);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("3");
  const [icon, setIcon] = useState("");
  const [parentId, setParentId] = useState<string>("root");
  const [goalHours, setGoalHours] = useState<number>(60);
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0].hex);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!open) return;

    if (currentSubject) {
      setTitle(currentSubject.title ?? "");
      setCategory(currentSubject.category ?? "");
      setDifficulty(String(currentSubject.difficulty ?? 3));
      setIcon(currentSubject.icon ?? "");
      setParentId(currentSubject.parentId ? currentSubject.parentId : "root");
      setGoalHours(Number.isFinite(currentSubject.goalMinutes) ? minutesToHours(currentSubject.goalMinutes) : 60);
      setColor(currentSubject.color ?? SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)].hex);
    } else {
      setTitle("");
      setCategory("");
      setDifficulty("3");
      setIcon("");
      setParentId("root");
      setGoalHours(60);
      setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)].hex);
    }

    setErrors({});
  }, [open, currentSubject]);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const validate = useCallback(() => {
    const e: Record<string, string | null> = {};
    if (!title.trim()) e.title = "O título é obrigatório.";
    if (!Number.isFinite(goalHours) || goalHours <= 0) e.goalHours = "A meta deve ser maior que 0.";
    return e;
  }, [title, goalHours]);

  const handleGoalHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setGoalHours(0);
      return;
    }
    const parsed = Number(val);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(Math.max(parsed, 0), 10000);
    setGoalHours(clamped);
  };

  const handleSubmit = useCallback(
    async (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      setErrors({});
      const e = validate();
      if (Object.keys(e).length > 0) {
        setErrors(e);
        return;
      }

      setIsSubmitting(true);

      const parsedGoalMinutes = hoursToMinutes(goalHours);

      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("category", (category || "").trim());
      formData.set("difficulty", String(Number(difficulty) || 3));
      formData.set("goalMinutes", String(parsedGoalMinutes));
      formData.set("icon", (icon || "").trim());
      formData.set("color", color); 
      formData.set("parentId", parentId === "root" ? "" : parentId ?? "");

      if (isEditing && currentSubject) {
        formData.set("id", currentSubject.id);
      }

      const action = isEditing ? updateSubject : createSubject;
      const toastId = toast.loading(isEditing ? `Atualizando "${title}"...` : "Criando tópico...");

      try {
        const result = (await action(formData)) as ActionResult;

        if (result?.success) {
          toast.success(result.message ?? (isEditing ? "Atualizado!" : "Criado!"), { id: toastId });
          handleClose();
        } else {
          toast.error(result?.message ?? "Erro ao salvar.", { id: toastId });
        }
      } catch (err) {
        toast.error("Erro de conexão.", { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, category, difficulty, goalHours, icon, color, parentId, isEditing, currentSubject, validate, handleClose]
  );

  const availableParents = potentialParents.filter((p) => p.id !== currentSubject?.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/60 p-0 shadow-2xl sm:max-w-md">

        {/* Barra de acento na cor escolhida (identidade sem fundo pesado). */}
        <div
          className="h-1.5 w-full transition-colors"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }}
        />

        {/* HEADER com PRÉVIA AO VIVO da matéria (avatar reflete ícone + cor). */}
        <DialogHeader className="space-y-0 px-6 pb-4 pt-5 text-left">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl transition-colors"
              style={{ backgroundColor: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
            >
              {icon ? <span className="leading-none">{icon}</span> : <FolderTree className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold leading-tight">
                {title.trim() || (isEditing ? "Editar tópico" : "Novo tópico")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing ? "Ajuste os detalhes desta matéria." : "Crie uma matéria raiz ou um subtópico."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6" noValidate>

          <div className="space-y-1.5">
            <Label htmlFor="subject-title" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Título da matéria <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: React Query, Cálculo I, Inglês…"
              autoFocus
              className={cn("h-11 bg-muted/30 text-base focus-visible:ring-1", errors.title && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.title && <p className="text-xs font-medium text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FolderTree className="h-3.5 w-3.5" /> Pertence a
              </Label>
              {/* Combobox com busca: com muitas matérias raiz, achar o pai é digitar */}
              <SubjectCombobox
                subjects={availableParents}
                value={parentId}
                onChange={setParentId}
                allowRoot
                className="h-10 bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <HashIcon className="h-3.5 w-3.5" /> Categoria
              </Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Tecnologia"
                className="h-10 bg-muted/30"
              />
            </div>
          </div>

          {/* ÍCONE + COR numa linha só, alinhados (era um grid de 5 col. torto). */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Ícone & cor
            </Label>
            <div className="flex items-center gap-3">
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="⚛️"
                aria-label="Emoji do ícone"
                className="h-10 w-12 shrink-0 bg-muted/30 p-0 text-center text-xl"
              />
              <div className="flex flex-1 flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => {
                  const selected = color === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className="grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: c.hex,
                        // Anel offset na própria cor, lendo o fundo do modal — limpo
                        // e sem depender das vars de ring do Tailwind.
                        boxShadow: selected ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c.hex}` : undefined,
                      }}
                      title={c.name}
                      aria-label={`Cor ${c.name}`}
                      aria-pressed={selected}
                    >
                      {selected && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Meta total</span>
                <span className="text-[10px] font-normal lowercase text-muted-foreground/70">{hoursToMinutes(goalHours)} min</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={goalHours}
                  onChange={handleGoalHoursChange}
                  className={cn("h-10 bg-muted/30 pr-8 text-base font-bold", errors.goalHours && "border-destructive")}
                />
                <span className="absolute right-3 top-2.5 text-sm font-bold text-muted-foreground">h</span>
              </div>
              {errors.goalHours && <p className="text-xs font-medium text-destructive">{errors.goalHours}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" /> Dificuldade
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-10 bg-muted/30">
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

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting} className="hover:bg-muted/50">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[150px] shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: color, color: readableTextOn(color) }}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? "Salvar alterações" : "Criar tópico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}