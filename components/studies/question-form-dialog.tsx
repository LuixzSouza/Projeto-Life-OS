"use client";

// Formulário de questão (criar/editar). Alternativas viram linhas com um rádio
// de "esta é a correta" — o gabarito é uma escolha ÚNICA e visível, não um
// checkbox que o aluno esquece de marcar em duas.

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { createQuestion, updateQuestion } from "@/app/(dashboard)/studies/actions/questions";
import { QUESTION_AREAS, QUESTION_AREA_LABELS, type QuestionArea } from "@/lib/enums";
import { optionLetter, difficultyLabel, type QuestionRow } from "./question-helpers";

export interface SubjectOption {
  id: string;
  title: string;
}

interface QuestionFormDialogProps {
  open: boolean;
  onClose: () => void;
  question?: QuestionRow | null;
  subjects: SubjectOption[];
  /** Área/matéria pré-selecionadas ao criar (herdadas do filtro da lista). */
  defaultArea?: string;
  defaultSubjectId?: string | null;
}

interface DraftOption {
  key: string;
  text: string;
}

const MAX_OPTIONS = 6;
const NO_SUBJECT = "none";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}

function initialOptions(question?: QuestionRow | null): DraftOption[] {
  if (question && question.options.length > 0) {
    return [...question.options]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ key: o.id, text: o.text }));
  }
  // 5 alternativas em branco: o formato do ENEM, já pronto.
  return Array.from({ length: 5 }, () => ({ key: newKey(), text: "" }));
}

function initialCorrect(question?: QuestionRow | null): string {
  if (!question) return "";
  const correct = [...question.options].sort((a, b) => a.position - b.position).find((o) => o.isCorrect);
  return correct?.id ?? "";
}

export function QuestionFormDialog({
  open,
  onClose,
  question,
  subjects,
  defaultArea,
  defaultSubjectId,
}: QuestionFormDialogProps) {
  const isEditing = Boolean(question);

  const [statement, setStatement] = useState(question?.statement ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [area, setArea] = useState<string>(question?.area ?? defaultArea ?? "OUTRA");
  const [difficulty, setDifficulty] = useState<string>(String(question?.difficulty ?? 3));
  const [source, setSource] = useState(question?.source ?? "");
  const [subjectId, setSubjectId] = useState<string>(question?.subjectId ?? defaultSubjectId ?? NO_SUBJECT);
  const [options, setOptions] = useState<DraftOption[]>(() => initialOptions(question));
  const [correctKey, setCorrectKey] = useState<string>(() => initialCorrect(question));
  const [saving, setSaving] = useState(false);

  const updateOption = (key: string, text: string) =>
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));

  const addOption = () =>
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, { key: newKey(), text: "" }]));

  const removeOption = (key: string) => {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.key !== key)));
    if (correctKey === key) setCorrectKey("");
  };

  const handleSubmit = async () => {
    const filled = options.filter((o) => o.text.trim().length > 0);
    if (filled.length < 2) {
      toast.error("Preencha pelo menos 2 alternativas.");
      return;
    }
    if (!correctKey || !filled.some((o) => o.key === correctKey)) {
      toast.error("Marque qual alternativa é a correta.");
      return;
    }

    setSaving(true);
    const payload = {
      statement,
      explanation,
      area,
      difficulty: Number(difficulty) || 3,
      source,
      subjectId: subjectId === NO_SUBJECT ? null : subjectId,
      options: filled.map((o) => ({ text: o.text, isCorrect: o.key === correctKey })),
    };

    try {
      const result = isEditing && question
        ? await updateQuestion(question.id, payload)
        : await createQuestion(payload);

      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erro ao salvar a questão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader
          title={isEditing ? "Editar questão" : "Nova questão"}
          description="Enunciado, alternativas e — o mais importante — a explicação da resposta."
        />

        <DialogBody className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="q-statement">Enunciado</Label>
            <Textarea
              id="q-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Escreva a pergunta com todo o contexto necessário para respondê-la."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Alternativas</Label>
            <p className="text-xs text-muted-foreground">Clique no círculo para marcar a correta.</p>
            <div className="space-y-2">
              {options.map((opt, i) => {
                const isCorrect = correctKey === opt.key;
                return (
                  <div key={opt.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectKey(opt.key)}
                      aria-label={`Marcar alternativa ${optionLetter(i)} como correta`}
                      aria-pressed={isCorrect}
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors",
                        isCorrect
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border/60 text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : optionLetter(i)}
                    </button>
                    <Input
                      value={opt.text}
                      onChange={(e) => updateOption(opt.key, e.target.value)}
                      placeholder={`Alternativa ${optionLetter(i)}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(opt.key)}
                      disabled={options.length <= 2}
                      aria-label={`Remover alternativa ${optionLetter(i)}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {options.length < MAX_OPTIONS && (
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addOption}>
                <Plus className="h-4 w-4" /> Alternativa
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-explanation">Resolução comentada (opcional)</Label>
            <Textarea
              id="q-explanation"
              value={explanation ?? ""}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Por que a correta está certa — é o que transforma o erro em aprendizado."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{QUESTION_AREA_LABELS[a as QuestionArea]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} — {difficultyLabel(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Matéria</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Sem matéria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>Sem matéria</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-source">Fonte (opcional)</Label>
              <Input
                id="q-source"
                value={source ?? ""}
                onChange={(e) => setSource(e.target.value)}
                placeholder="ENEM 2023, apostila, aula…"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? "Salvar" : "Adicionar ao banco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
