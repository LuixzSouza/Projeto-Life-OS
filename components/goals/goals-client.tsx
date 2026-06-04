"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus, Search, Target, Pencil, Trash2, GraduationCap, Loader2, CheckCircle2,
  Circle, CalendarDays, BookOpen, X, Flag,
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
import { EntityTags } from "@/components/connect/entity-tags";
import { EntityAttachments } from "@/components/connect/entity-attachments";
import { EntityLinks } from "@/components/connect/entity-links";
import {
  getGoals, createGoal, updateGoal, deleteGoal,
  addGoalTask, toggleGoalTask, deleteGoalTask,
  type GoalData, type GoalSubject, type GoalTaskData,
} from "@/app/(dashboard)/goals/actions";

const PRIORITY_META: Record<number, { label: string; className: string }> = {
  1: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  3: { label: "Média", className: "bg-amber-500/10 text-amber-600" },
  5: { label: "Alta", className: "bg-rose-500/10 text-rose-600" },
};

function priorityMeta(p: number) {
  if (p >= 5) return PRIORITY_META[5];
  if (p <= 1) return PRIORITY_META[1];
  return PRIORITY_META[3];
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function GoalsClient({ initialGoals, subjects }: { initialGoals: GoalData[]; subjects: GoalSubject[] }) {
  const [goals, setGoals] = useState<GoalData[]>(initialGoals);
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [editing, setEditing] = useState<GoalData | "new" | null>(null);
  const [deleting, setDeleting] = useState<GoalData | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => setGoals(await getGoals());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return goals.filter((g) => {
      if (onlyOpen && g.status === "DONE") return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        (g.description?.toLowerCase().includes(q) ?? false) ||
        (g.subjectTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [goals, search, onlyOpen]);

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
          <Button variant={onlyOpen ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setOnlyOpen((v) => !v)}>
            <Circle className="h-4 w-4" /> Em aberto
          </Button>
          <Button className="gap-2" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <Target className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {goals.length === 0 ? "Nenhuma meta ainda. Defina seu primeiro objetivo!" : "Nada encontrado para esse filtro."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((goal) => {
            const pr = priorityMeta(goal.priority);
            const progress = goal.totalTasks > 0 ? Math.round((goal.doneTasks / goal.totalTasks) * 100) : 0;
            const isDone = goal.status === "DONE";
            const target = fmtDate(goal.targetDate);
            return (
              <div
                key={goal.id}
                className="group flex cursor-pointer flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => setEditing(goal)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className={cn("line-clamp-2 font-semibold text-foreground", isDone && "line-through text-muted-foreground")}>
                    {goal.title}
                  </h3>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
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
                    <span className="font-bold text-foreground">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", isDone || progress === 100 ? "bg-emerald-500" : "bg-primary")}
                      style={{ width: `${isDone ? 100 : progress}%` }}
                    />
                  </div>
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
                  {target && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" /> {target}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex justify-end gap-1 border-t border-border/40 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(goal); }} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleting(goal); }}
                    title="Mover para a lixeira"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        state={editing}
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
  state, subjects, onClose, onSaved, onTasksChanged,
}: {
  state: GoalData | "new" | null;
  subjects: GoalSubject[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onTasksChanged: () => Promise<void>;
}) {
  const isEdit = state !== null && state !== "new";
  const goal = isEdit ? (state as GoalData) : null;

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [subjectId, setSubjectId] = useState(goal?.subjectId ?? "none");
  const [status, setStatus] = useState(goal?.status ?? "IN_PROGRESS");
  const [priority, setPriority] = useState(String(goal?.priority ?? 3));
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? goal.targetDate.slice(0, 10) : "");
  const [pending, runTransition] = useTransition();

  // Subtarefas (só em edição): estado local com atualização otimista.
  const [tasks, setTasks] = useState<GoalTaskData[]>(goal?.tasks ?? []);
  const [newTask, setNewTask] = useState("");
  const [, startTask] = useTransition();

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
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROGRESS">Em progresso</SelectItem>
                  <SelectItem value="DONE">Concluída</SelectItem>
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
              <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Passos</span>
                {tasks.length > 0 && <span>{doneCount}/{tasks.length}</span>}
              </p>
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
                <Button type="button" size="icon" className="h-8 w-8 shrink-0" disabled={!newTask.trim()} onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Tecido conectivo — só em edição (precisa do id). Editores form-safe. */}
          {goal && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Tags, Anexos & Relações
              </p>
              <EntityTags entityType="goal" entityId={goal.id} />
              <EntityAttachments entityType="goal" entityId={goal.id} />
              <EntityLinks entityType="goal" entityId={goal.id} />
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
