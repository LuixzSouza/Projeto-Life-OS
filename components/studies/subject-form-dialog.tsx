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
      <DialogContent className="sm:max-w-md bg-background border-border/60 shadow-2xl p-0 overflow-hidden rounded-2xl">
        
        {/* HEADER COM COR DINÂMICA */}
        <div className="p-6 pb-4 border-b border-border/40" style={{ backgroundColor: `${color}15` }}>
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold" style={{ color: color }}>
                <div className="p-2 rounded-xl bg-background shadow-sm border border-border/50">
                    {isEditing ? <HashIcon className="w-5 h-5" /> : <FolderTree className="w-5 h-5" />}
                </div>
                {isEditing ? `Editar Tópico` : "Novo Tópico"}
            </DialogTitle>
            <DialogDescription className="text-foreground/60">
                {isEditing ? "Ajuste os detalhes desta matéria." : "Crie uma nova matéria raiz ou subtópico de estudos."}
            </DialogDescription>
            </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          
          <div className="space-y-2">
            <Label htmlFor="subject-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Título da Matéria <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: React Query, Cálculo I, Inglês..."
              autoFocus
              className={cn("h-11 text-base bg-muted/20 focus-visible:ring-1", errors.title && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.title && <p className="text-xs text-destructive mt-1 font-medium">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderTree className="h-3.5 w-3.5" /> Pertence a...
              </Label>
              <Select value={parentId} onValueChange={(v) => setParentId(v)}>
                <SelectTrigger className="bg-muted/20 h-10">
                  <SelectValue placeholder="-- Raiz principal --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root" className="font-semibold text-primary">-- Raiz principal --</SelectItem>
                  {availableParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon ? `${p.icon} ` : ""}{p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HashIcon className="h-3.5 w-3.5" /> Categoria
              </Label>
              <Input 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                placeholder="Ex: Tecnologia" 
                className="bg-muted/20 h-10"
              />
            </div>
          </div>

          {/* SELETOR DE CORES E EMOJI */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-1 space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block text-center">Ícone</Label>
                <Input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="⚛️"
                    className="h-10 text-center text-xl bg-muted/20 p-0"
                />
            </div>
            
            <div className="col-span-4 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Cor da Matéria
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                    {SUBJECT_COLORS.map((c) => (
                        <button
                            key={c.hex}
                            type="button"
                            onClick={() => setColor(c.hex)}
                            className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm",
                                // 🟢 CORREÇÃO: Usando outline nativo em vez de ring do tailwind
                                color === c.hex ? "outline outline-2 outline-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                            )}
                            style={{ backgroundColor: c.hex, outlineColor: c.hex }}
                            title={c.name}
                        >
                            {color === c.hex && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Meta Total</span>
                <span className="text-[10px] lowercase text-muted-foreground font-normal">{hoursToMinutes(goalHours)} min</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={goalHours}
                  onChange={handleGoalHoursChange}
                  className={cn("font-bold text-base pr-8 bg-muted/20 h-10", errors.goalHours && "border-destructive")}
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-bold">h</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Dificuldade
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-muted/20 h-10">
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

          <DialogFooter className="pt-4 mt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting} className="hover:bg-muted/50">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="shadow-lg min-w-[140px] text-white"
              style={{ backgroundColor: color }}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? "Salvar Alterações" : "Criar Tópico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}