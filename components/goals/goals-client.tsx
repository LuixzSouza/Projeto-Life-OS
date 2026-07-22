"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus, Search, Target, Pencil, Trash2, GraduationCap, Loader2, CheckCircle2,
  Circle, CalendarDays, X, Flag, AlertTriangle, Trophy, ChevronDown, Sparkles, ArrowRight,
  LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntityConnections } from "@/components/connect/entity-connections";
import { SubjectCombobox } from "@/components/studies/subject-combobox";
import {
  getGoals, createGoal, updateGoal, deleteGoal, setGoalStatus,
  addGoalTask, toggleGoalTask, deleteGoalTask, suggestGoalSteps,
  type GoalData, type GoalSubject, type GoalTaskData,
} from "@/app/(dashboard)/goals/actions";
import { GoalsBoard } from "./goals-board";
import {
  GOAL_COLUMNS, daysUntil, deadlineChip, normalizeGoalStatus, priorityMeta,
  type GoalStatus,
} from "./goal-helpers";

/** Chave da preferência Lista/Quadro (só UI — não vale uma coluna no banco). */
const VIEW_KEY = "lifeos:goals:view";

export function GoalsClient({
  initialGoals, subjects, initialOpenId,
}: {
  initialGoals: GoalData[];
  subjects: GoalSubject[];
  /** Deep-link (?goal=<id>): abre a meta direto no diálogo (busca global). */
  initialOpenId?: string | null;
}) {
  const [goals, setGoals] = useState<GoalData[]>(initialGoals);
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [editing, setEditing] = useState<GoalData | "new" | null>(
    () => (initialOpenId ? initialGoals.find((g) => g.id === initialOpenId) ?? null : null),
  );
  /** Coluna de destino ao criar do Quadro ("+" no cabeçalho da coluna). */
  const [newStatus, setNewStatus] = useState<GoalStatus>("IN_PROGRESS");
  const [deleting, setDeleting] = useState<GoalData | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [, startTransition] = useTransition();

  // Preferência de visão: lida depois da montagem para não divergir do HTML do servidor.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(VIEW_KEY) === "board") setView("board");
  }, []);

  const switchView = (next: "list" | "board") => {
    setView(next);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* modo privado: só não lembra */ }
  };

  const refresh = async () => setGoals(await getGoals());

  // Deep-link quando o componente JÁ está montado (ex.: palette em cima de /goals).
  useEffect(() => {
    if (!initialOpenId) return;
    setEditing((current) => {
      if (current !== null) return current; // não rouba o foco de um diálogo aberto
      return goals.find((g) => g.id === initialOpenId) ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à mudança do deep-link
  }, [initialOpenId]);

  const [showDone, setShowDone] = useState(false);

  const { open, done, overdueCount, visible } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = goals.filter((g) => {
      if (onlyOpen && g.status === "DONE") return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        (g.description?.toLowerCase().includes(q) ?? false) ||
        (g.subjectTitle?.toLowerCase().includes(q) ?? false)
      );
    });
    const open = filtered.filter((g) => g.status !== "DONE");
    const done = filtered.filter((g) => g.status === "DONE");
    // Em aberto: atrasadas primeiro, depois prazo mais perto, depois prioridade.
    open.sort((a, b) => {
      const da = a.targetDate ? daysUntil(a.targetDate) : Infinity;
      const db = b.targetDate ? daysUntil(b.targetDate) : Infinity;
      const oa = da < 0 ? 0 : 1;
      const ob = db < 0 ? 0 : 1;
      if (oa !== ob) return oa - ob;
      if (da !== db) return da - db;
      return b.priority - a.priority;
    });
    const overdueCount = goals.filter((g) => g.status !== "DONE" && g.targetDate && daysUntil(g.targetDate) < 0).length;
    return { open, done, overdueCount, visible: filtered };
  }, [goals, search, onlyOpen]);

  // Move a meta de coluna (otimista, com rollback). Serve ao Quadro e ao botão de concluir.
  const moveGoal = (goal: GoalData, next: GoalStatus) => {
    const previous = goal.status;
    if (previous === next) return;
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: next } : g)));
    startTransition(async () => {
      const res = await setGoalStatus(goal.id, next);
      if (!res.success) {
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: previous } : g)));
        toast.error("Não consegui atualizar a meta.");
      } else if (next === "DONE") {
        toast.success("Meta dominada! 🏆");
      }
    });
  };

  // Concluir/reabrir direto do card (a lista só distingue feito vs. em aberto).
  const quickToggle = (goal: GoalData) => {
    moveGoal(goal, goal.status === "DONE" ? "IN_PROGRESS" : "DONE");
  };

  // "+" no cabeçalho de uma coluna: abre o diálogo já com aquela coluna escolhida.
  const createInColumn = (status: GoalStatus) => {
    setNewStatus(status);
    setEditing("new");
  };

  const handleDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const res = await deleteGoal(id);
      if (res.success) {
        await refresh();
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      setDeleting(null);
    });
  };

  // Card usado nas duas seções (Em aberto / Concluídas).
  const renderGoal = (goal: GoalData) => {
    const pr = priorityMeta(goal.priority);
    const progress = goal.totalTasks > 0 ? Math.round((goal.doneTasks / goal.totalTasks) * 100) : 0;
    const isDone = goal.status === "DONE";
    const chip = deadlineChip(goal.targetDate, isDone);
    const nextStep = isDone ? null : goal.tasks.find((t) => !t.isDone) ?? null;
    return (
      <div
        key={goal.id}
        className={cn(
          "group flex cursor-pointer flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
          isDone && "opacity-80",
        )}
        onClick={() => setEditing(goal)}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); quickToggle(goal); }}
              title={isDone ? "Reabrir meta" : "Concluir meta"}
              className="mt-0.5 shrink-0 text-muted-foreground/40 transition-colors hover:text-emerald-500"
            >
              {isDone
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : <Circle className="h-5 w-5" />}
            </button>
            <h3 className={cn("line-clamp-2 font-semibold text-foreground", isDone && "line-through text-muted-foreground")}>
              {goal.title}
            </h3>
          </div>
          {!isDone && (
            <Badge className={cn("shrink-0 gap-1 border-none text-[10px]", pr.className)}>
              <Flag className="h-3 w-3" /> {pr.label}
            </Badge>
          )}
        </div>

        {goal.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
        )}

        {/* Progresso */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-muted-foreground">
              {goal.totalTasks > 0 ? `${goal.doneTasks}/${goal.totalTasks} passos` : "Sem passos"}
            </span>
            <span className="font-bold text-foreground">{isDone ? 100 : progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", isDone || progress === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${isDone ? 100 : progress}%` }}
            />
          </div>
          {nextStep && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground" title={nextStep.title}>
              <ArrowRight className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="truncate">{nextStep.title}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {goal.subjectTitle && (
            <Badge
              variant="secondary"
              className="gap-1 border-none text-[10px]"
              style={{ backgroundColor: `${goal.subjectColor ?? "#6366f1"}1a`, color: goal.subjectColor ?? "#6366f1" }}
            >
              <GraduationCap className="h-3 w-3" /> {goal.subjectTitle}
            </Badge>
          )}
          {chip && (
            <span className={cn("inline-flex items-center gap-1 text-[10px]", chip.className)}>
              {chip.urgent ? <AlertTriangle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {chip.label}
            </span>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-1 border-t border-border/40 pt-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(goal); }} title="Editar" aria-label="Editar meta">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeleting(goal); }}
            title="Mover para a lixeira"
            aria-label="Mover meta para a lixeira"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar meta, matéria…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Badge className="gap-1 border-none bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </Badge>
          )}
          {/* Lista (foco no que fazer agora) · Quadro (visão do fluxo de domínio) */}
          <div className="flex shrink-0 items-center rounded-lg border border-border/60 p-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => switchView("list")}
              title="Ver em lista"
              aria-label="Ver em lista"
              aria-pressed={view === "list"}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => switchView("board")}
              title="Ver em quadro"
              aria-label="Ver em quadro"
              aria-pressed={view === "board"}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {view === "list" && (
            <Button variant={onlyOpen ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setOnlyOpen((v) => !v)}>
              <Circle className="h-4 w-4" /> Em aberto
            </Button>
          )}
          <Button className="gap-2" onClick={() => createInColumn("IN_PROGRESS")}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        </div>
      </div>

      {/* QUADRO DE ESTUDO: Para estudar → Estudando → Revisar → Dominado */}
      {view === "board" ? (
        <GoalsBoard
          goals={visible}
          onOpen={setEditing}
          onMove={moveGoal}
          onCreate={createInColumn}
        />
      ) : open.length === 0 && done.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <Target className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {goals.length === 0 ? "Nenhuma meta ainda. Defina seu primeiro objetivo!" : "Nada encontrado para esse filtro."}
          </p>
        </div>
      ) : (
        <>
          {open.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 py-8 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-emerald-500" /> Tudo concluído por aqui. Hora de uma meta nova!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.map(renderGoal)}
            </div>
          )}

          {/* Concluídas (recolhível) */}
          {!onlyOpen && done.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trophy className="h-4 w-4 text-amber-500" />
                Concluídas ({done.length})
                <ChevronDown className={cn("h-4 w-4 transition-transform", showDone && "rotate-180")} />
              </button>
              {showDone && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {done.map(renderGoal)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <GoalDialog
        key={editing === "new" ? `new-${newStatus}` : editing?.id ?? "closed"}
        state={editing}
        defaultStatus={newStatus}
        subjects={subjects}
        onClose={() => setEditing(null)}
        onSaved={async () => { await refresh(); setEditing(null); }}
        onTasksChanged={refresh}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.title}&quot; (e seus passos) vai para a lixeira. Você pode restaurar depois em /trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Mover para a lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GoalDialog({
  state, subjects, defaultStatus, onClose, onSaved, onTasksChanged,
}: {
  state: GoalData | "new" | null;
  subjects: GoalSubject[];
  /** Coluna sugerida ao criar (vem do "+" do Quadro). */
  defaultStatus: GoalStatus;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onTasksChanged: () => Promise<void>;
}) {
  const isEdit = state !== null && state !== "new";
  const goal = isEdit ? (state as GoalData) : null;

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [subjectId, setSubjectId] = useState(goal?.subjectId ?? "none");
  const [status, setStatus] = useState<GoalStatus>(
    goal ? normalizeGoalStatus(goal.status) : defaultStatus,
  );
  const [priority, setPriority] = useState(String(goal?.priority ?? 3));
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? goal.targetDate.slice(0, 10) : "");
  const [pending, runTransition] = useTransition();

  // Subtarefas (só em edição): estado local com atualização otimista.
  const [tasks, setTasks] = useState<GoalTaskData[]>(goal?.tasks ?? []);
  const [newTask, setNewTask] = useState("");
  const [, startTask] = useTransition();
  const [suggesting, startSuggest] = useTransition();

  // Pede à IA para quebrar a meta em passos e recarrega a lista do servidor.
  const suggestSteps = () => {
    if (!goal) return;
    startSuggest(async () => {
      const res = await suggestGoalSteps(goal.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      if (res.created > 0) toast.success(res.message);
      else toast.info(res.message);
      await onTasksChanged();
      const fresh = await getGoals();
      const updated = fresh.find((g) => g.id === goal.id);
      if (updated) setTasks(updated.tasks);
    });
  };

  const save = () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    const fd = new FormData();
    if (goal) fd.set("id", goal.id);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("subjectId", subjectId);
    fd.set("status", status);
    fd.set("priority", priority);
    fd.set("targetDate", targetDate);

    runTransition(async () => {
      const res = goal ? await updateGoal(fd) : await createGoal(fd);
      if (res.success) {
        toast.success(res.message);
        await onSaved();
      } else {
        toast.error(res.message);
      }
    });
  };

  const addTask = () => {
    if (!goal) return;
    const clean = newTask.trim();
    if (!clean) return;
    const tempId = `temp-${tasks.length}-${clean.length}`;
    setTasks((prev) => [...prev, { id: tempId, title: clean, isDone: false }]);
    setNewTask("");
    startTask(async () => {
      await addGoalTask(goal.id, clean);
      await onTasksChanged();
      // Recarrega os ids reais do servidor (substitui o temp).
      const fresh = await getGoals();
      const updated = fresh.find((g) => g.id === goal.id);
      if (updated) setTasks(updated.tasks);
    });
  };

  const toggleTask = (task: GoalTaskData) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isDone: !t.isDone } : t)));
    startTask(async () => {
      await toggleGoalTask(task.id, task.isDone);
      await onTasksChanged();
    });
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTask(async () => {
      await deleteGoalTask(taskId);
      await onTasksChanged();
    });
  };

  const doneCount = tasks.filter((t) => t.isDone).length;

  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader
          icon={<Target className="h-5 w-5" />}
          title={isEdit ? "Editar meta" : "Nova meta"}
          description="Defina o objetivo e quebre em passos concretos."
        />

        <DialogBody className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Dominar React Server Components"
            className="text-base font-semibold"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o objetivo (opcional)…"
            className="min-h-[80px]"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Matéria</label>
              <SubjectCombobox
                subjects={subjects}
                value={subjectId}
                onChange={setSubjectId}
                emptyOption={{ value: "none", label: "Nenhuma" }}
                placeholder="Nenhuma"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Baixa</SelectItem>
                  <SelectItem value="3">Média</SelectItem>
                  <SelectItem value="5">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(normalizeGoalStatus(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_COLUMNS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.formLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prazo</label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          {/* Subtarefas — só em edição (precisam do id da meta) */}
          {goal && (
            <div className="space-y-2 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Passos{tasks.length > 0 && <span className="ml-2 font-semibold normal-case tracking-normal">{doneCount}/{tasks.length}</span>}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-primary hover:text-primary"
                  disabled={suggesting}
                  onClick={suggestSteps}
                  title="A IA quebra a meta em passos concretos (sem repetir os existentes)"
                >
                  {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Sugerir com IA
                </Button>
              </div>
              <ul className="space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5">
                    <button type="button" onClick={() => toggleTask(t)} className="shrink-0">
                      {t.isDone
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <Circle className="h-4 w-4 text-muted-foreground/50" />}
                    </button>
                    <span className={cn("flex-1 truncate text-sm", t.isDone && "text-muted-foreground line-through")}>{t.title}</span>
                    <button
                      type="button"
                      onClick={() => removeTask(t.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="Remover passo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
                  placeholder="Adicionar passo e Enter…"
                  className="h-8 text-sm"
                />
                <Button type="button" size="icon" aria-label="Adicionar passo" className="h-8 w-8 shrink-0" disabled={!newTask.trim()} onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Tecido conectivo (card recolhível) — só em edição (precisa do id). Form-safe. */}
          {goal && (
            <div className="pt-2">
              <EntityConnections entityType="goal" entityId={goal.id} />
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={pending} className="min-w-[110px]">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
