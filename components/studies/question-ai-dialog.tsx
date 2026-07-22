"use client";

// Gerar questões com IA. O caminho mais curto entre "estudei isso" e "me
// pergunta sobre isso": digita o assunto (ou cola o resumo da aula) e o banco
// enche. Sem IA configurada, a ação devolve o recado e o botão manual continua
// ali — nada quebra (princípio do projeto).

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { generateQuestions } from "@/app/(dashboard)/studies/actions/questions";
import { QUESTION_AREAS, QUESTION_AREA_LABELS, type QuestionArea } from "@/lib/enums";
import { difficultyLabel } from "./question-helpers";
import type { SubjectOption } from "./question-form-dialog";

interface QuestionAiDialogProps {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  defaultArea?: string;
  defaultSubjectId?: string | null;
}

const NO_SUBJECT = "none";

export function QuestionAiDialog({ open, onClose, subjects, defaultArea, defaultSubjectId }: QuestionAiDialogProps) {
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState("5");
  const [area, setArea] = useState<string>(defaultArea ?? "OUTRA");
  const [difficulty, setDifficulty] = useState("3");
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId ?? NO_SUBJECT);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      toast.error("Diga sobre qual assunto gerar as questões.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Escrevendo as questões…");
    try {
      const result = await generateQuestions({
        topic,
        sourceText: sourceText.trim() || null,
        count: Number(count) || 5,
        area,
        difficulty: Number(difficulty) || 3,
        subjectId: subjectId === NO_SUBJECT ? null : subjectId,
      });
      if (result.success) {
        toast.success(result.message, { id: toastId });
        onClose();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch {
      toast.error("Erro ao gerar as questões.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Gerar questões com IA"
          description="Diga o assunto — ou cole o conteúdo da aula — e receba questões com gabarito e explicação."
        />

        <DialogBody className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ai-topic">Assunto</Label>
            <Input
              id="ai-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Revolução Industrial, funções do 2º grau, ligações químicas…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-source">Conteúdo base (opcional)</Label>
            <Textarea
              id="ai-source"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Cole aqui o resumo, a nota ou o trecho da apostila. A IA gera EM CIMA desse texto, sem inventar."
              rows={5}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>
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
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar questões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
