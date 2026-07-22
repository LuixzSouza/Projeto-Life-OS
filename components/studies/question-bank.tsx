"use client";

// BANCO DE QUESTÕES — a lista viva do que o aluno já transformou em pergunta.
// Cada cartão mostra o aproveitamento real (acertos/tentativas), porque é esse
// número que decide o que cai no próximo simulado no modo "Meus erros".

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Plus, Sparkles, Pencil, Trash2, ChevronDown, Target,
  ListChecks, Lightbulb, Loader2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { QUESTION_AREAS, QUESTION_AREA_LABELS, type QuestionArea } from "@/lib/enums";
import { deleteQuestion } from "@/app/(dashboard)/studies/actions/questions";
import { QuestionFormDialog, type SubjectOption } from "./question-form-dialog";
import { QuestionAiDialog } from "./question-ai-dialog";
import {
  accuracy, accuracyClass, areaBadgeClass, areaLabel, difficultyLabel, optionLetter,
  type QuestionRow,
} from "./question-helpers";

interface QuestionBankProps {
  questions: QuestionRow[];
  subjects: SubjectOption[];
}

const ALL = "all";

export function QuestionBank({ questions, subjects }: QuestionBankProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>(ALL);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Um único modal global por finalidade (nunca dentro do .map) — regra do projeto.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<QuestionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const subjectTitles = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.title])),
    [subjects],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (areaFilter !== ALL && q.area !== areaFilter) return false;
      if (subjectFilter !== ALL && q.subjectId !== subjectFilter) return false;
      if (!term) return true;
      return (
        q.statement.toLowerCase().includes(term) ||
        (q.explanation ?? "").toLowerCase().includes(term) ||
        q.options.some((o) => o.text.toLowerCase().includes(term))
      );
    });
  }, [questions, search, areaFilter, subjectFilter]);

  // Panorama honesto: só conta aproveitamento de questões já respondidas.
  const stats = useMemo(() => {
    const answered = questions.filter((q) => q.timesAnswered > 0);
    const totalAnswers = answered.reduce((s, q) => s + q.timesAnswered, 0);
    const totalCorrect = answered.reduce((s, q) => s + q.timesCorrect, 0);
    return {
      total: questions.length,
      answered: answered.length,
      rate: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null,
    };
  }, [questions]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (q: QuestionRow) => {
    setEditing(q);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteQuestion(pendingDelete.id);
    setDeleting(false);
    if (result.success) {
      toast.success(result.message);
      setPendingDelete(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* PANORAMA + AÇÕES */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Stat icon={<ListChecks className="h-4 w-4" />} value={String(stats.total)} label="questões" />
          <Stat icon={<Target className="h-4 w-4" />} value={String(stats.answered)} label="já respondidas" />
          <Stat
            icon={<Lightbulb className="h-4 w-4" />}
            value={stats.rate === null ? "—" : `${stats.rate}%`}
            label="aproveitamento"
            valueClass={stats.rate === null ? undefined : accuracyClass(stats.rate)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> Gerar com IA
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova questão
          </Button>
        </div>
      </div>

      {/* FILTROS (rolam na horizontal no celular — padrão do design system) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no enunciado, alternativas ou explicação…"
            className="pl-9"
            aria-label="Buscar questões"
          />
        </div>

        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[190px] shrink-0" aria-label="Filtrar por área">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as áreas</SelectItem>
            {QUESTION_AREAS.map((a) => (
              <SelectItem key={a} value={a}>{QUESTION_AREA_LABELS[a as QuestionArea]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subjects.length > 0 && (
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[170px] shrink-0" aria-label="Filtrar por matéria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as matérias</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* LISTA */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-border/70 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {questions.length === 0 ? "Seu banco está vazio" : "Nada com esses filtros"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {questions.length === 0
                  ? "Crie questões à mão ou deixe a IA gerar a partir de um assunto. Elas viram simulados cronometrados depois."
                  : "Ajuste a busca ou os filtros para encontrar a questão."}
              </p>
            </div>
            {questions.length === 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setAiOpen(true)}>
                  <Sparkles className="h-4 w-4" /> Gerar com IA
                </Button>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Nova questão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const isOpen = expanded === q.id;
            const acc = accuracy(q);
            const sorted = [...q.options].sort((a, b) => a.position - b.position);
            return (
              <Card
                key={q.id}
                className="border-border/40 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : q.id)}
                      className="flex-1 text-left"
                      aria-expanded={isOpen}
                    >
                      <p className={cn("text-sm font-medium leading-relaxed", !isOpen && "line-clamp-2")}>
                        {q.statement}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={cn("border-none text-[11px]", areaBadgeClass(q.area))}>
                          {areaLabel(q.area)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{difficultyLabel(q.difficulty)}</span>
                        {q.subjectId && subjectTitles.has(q.subjectId) && (
                          <span className="text-[11px] text-muted-foreground">· {subjectTitles.get(q.subjectId)}</span>
                        )}
                        {acc !== null ? (
                          <span className={cn("text-[11px] font-semibold", accuracyClass(acc))}>
                            · {acc}% ({q.timesCorrect}/{q.timesAnswered})
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">· nunca respondida</span>
                        )}
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost" size="icon" aria-label="Editar questão"
                        onClick={(e) => { e.stopPropagation(); openEdit(q); }}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" aria-label="Remover questão"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(q); }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" aria-label={isOpen ? "Recolher" : "Ver alternativas"}
                        onClick={() => setExpanded(isOpen ? null : q.id)}
                      >
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                      {sorted.map((o, i) => (
                        <div
                          key={o.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                            o.isCorrect ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted/40",
                          )}
                        >
                          <span className="font-bold">{optionLetter(i)}</span>
                          <span>{o.text}</span>
                        </div>
                      ))}
                      {q.explanation && (
                        <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Por quê: </span>
                          {q.explanation}
                        </div>
                      )}
                      {q.source && (
                        <p className="text-[11px] text-muted-foreground">Fonte: {q.source}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAIS GLOBAIS (fora do .map) */}
      {formOpen && (
        <QuestionFormDialog
          // A `key` remonta o formulário a cada questão — estado inicial limpo
          // sem precisar sincronizar props em useEffect.
          key={editing?.id ?? "new"}
          open={formOpen}
          onClose={closeForm}
          question={editing}
          subjects={subjects}
          defaultArea={areaFilter !== ALL ? areaFilter : undefined}
          defaultSubjectId={subjectFilter !== ALL ? subjectFilter : null}
        />
      )}

      {aiOpen && (
        <QuestionAiDialog
          open={aiOpen}
          onClose={() => { setAiOpen(false); router.refresh(); }}
          subjects={subjects}
          defaultArea={areaFilter !== ALL ? areaFilter : undefined}
          defaultSubjectId={subjectFilter !== ALL ? subjectFilter : null}
        />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta questão?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela sai do banco e de futuros simulados. As provas já feitas continuam no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon, value, label, valueClass,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className={cn("text-lg font-black leading-none", valueClass)}>{value}</span>
        <span className="ml-1 text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}
