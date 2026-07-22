"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronLeft, ArrowUp, ArrowDown, Play, Loader2, Pencil,
  Dumbbell, ClipboardList, Save, Target as TargetIcon, Share2, Download, Upload, X, ClipboardPaste, ImageDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { decodePlans, buildPlanShareLink, type SharedPlan } from "./session/plan-share";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listWorkoutPlans, saveWorkoutPlan, deleteWorkoutPlan } from "@/app/(dashboard)/health/actions";
import type { ImportedPlan } from "./session/plan-import-types";
import { PlanPhotoImport } from "./plan-photo-import";
import { sharePlanImage } from "./session/plan-share-image";
import { groupOfExercise } from "./exercise-db";
import { guessEquipment, EQUIPMENT_META, uid } from "./session/session-types";
import { ExerciseThumb } from "./session/exercise-thumb";
import { ExerciseMediaEditor } from "./exercise-media-editor";
import { savePendingStart } from "./session/session-storage";
import { divisionToStart } from "./session/plan-start";
import {
  PLAN_GOAL_META, WEEKDAY_LABELS, formatTarget, totalExercises, newPlan, newDivision, newPlanExercise,
  type WorkoutPlan, type PlanGoal, type PlanDivision, type PlanExercise, type ExerciseTarget, type IntensityType,
} from "./session/plan-types";

const GOALS = Object.keys(PLAN_GOAL_META) as PlanGoal[];
const DIVISION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function PlanBuilder() {
  const router = useRouter();
  const [plans, setPlans] = useState<WorkoutPlan[] | null>(null);
  const [draft, setDraft] = useState<WorkoutPlan | null>(null); // ficha em edição (cópia local)
  const [activeDiv, setActiveDiv] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importValue, setImportValue] = useState("");
  // Fila de fichas cujo nome já existe — resolvidas uma a uma num diálogo (single
  // modal controlado por estado, nunca dentro de .map). O acumulador fica num ref
  // pra não sofrer com closures obsoletas entre passos assíncronos do diálogo.
  const [conflicts, setConflicts] = useState<{ shared: SharedPlan; existingId: string }[]>([]);
  const stats = useRef({ saved: 0, skipped: 0 });

  useEffect(() => {
    let active = true;
    listWorkoutPlans().then((p) => { if (active) setPlans(p); }).catch(() => { if (active) setPlans([]); });
    return () => { active = false; };
  }, []);

  // Salva (ou sobrescreve, se `id`) uma ficha e reflete na lista local. true = ok.
  const saveShared = async (sp: SharedPlan, id?: string): Promise<boolean> => {
    const res = await saveWorkoutPlan({ id, name: sp.name, goal: sp.goal, divisions: sp.divisions });
    if (res.success && res.plan) {
      const plan = res.plan;
      setPlans((prev) => [plan, ...(prev ?? []).filter((p) => p.id !== plan.id)]);
      return true;
    }
    return false;
  };

  const finishImport = () => {
    const { saved, skipped } = stats.current;
    if (saved > 0) toast.success(`${saved} ficha${saved > 1 ? "s" : ""} importada${saved > 1 ? "s" : ""}! 🎉`);
    else if (skipped > 0) toast.info("Nenhuma alteração — importação cancelada.");
    else toast.error("Não consegui salvar a ficha. Verifique se o banco está atualizado.");
  };

  // Salva direto as fichas inéditas; enfileira as de nome repetido pro diálogo.
  const beginImport = async (shared: SharedPlan[]): Promise<void> => {
    stats.current = { saved: 0, skipped: 0 };
    const byName = new Map((plans ?? []).map((p) => [p.name.trim().toLowerCase(), p]));
    const queued: { shared: SharedPlan; existingId: string }[] = [];
    for (const sp of shared) {
      const existing = byName.get(sp.name.trim().toLowerCase());
      if (existing) queued.push({ shared: sp, existingId: existing.id });
      else if (await saveShared(sp)) stats.current.saved += 1;
    }
    if (queued.length > 0) setConflicts(queued); // abre o diálogo para queued[0]
    else finishImport();
  };

  // Resolve o conflito do topo da fila e avança (ou encerra).
  const resolveConflict = async (action: "replace" | "copy" | "cancel") => {
    const head = conflicts[0];
    if (!head) return;
    if (action === "replace") {
      // Sobrescreve mantendo o MESMO id (preserva a identidade/datas da ficha).
      if (await saveShared(head.shared, head.existingId)) stats.current.saved += 1;
    } else if (action === "copy") {
      if (await saveShared({ ...head.shared, name: `${head.shared.name} (Cópia)` })) stats.current.saved += 1;
    } else {
      stats.current.skipped += 1;
    }
    // "Cancelar" interrompe o fluxo inteiro; as demais avançam para o próximo conflito.
    const rest = action === "cancel" ? [] : conflicts.slice(1);
    if (action === "cancel" && conflicts.length > 1) stats.current.skipped += conflicts.length - 1;
    setConflicts(rest);
    if (rest.length === 0) finishImport();
  };

  // Import via LINK (?planimport=<código>): amigo manda no WhatsApp e a ficha cai aqui.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.location.search.match(/[?&]planimport=([^&\s]+)/);
    if (!m) return;
    const shared = decodePlans(m[1]);
    const params = new URLSearchParams(window.location.search);
    params.delete("planimport"); // limpa pra não reimportar no refresh
    const qs = params.toString();
    router.replace(`/health/gym${qs ? `?${qs}` : ""}`);
    if (!shared) { toast.error("O link de ficha recebido é inválido."); return; }
    void beginImport(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitImport = async () => {
    const shared = decodePlans(importValue);
    if (!shared) { toast.error("Código inválido. Cole o link ou o código completo da ficha."); return; }
    setImportValue("");
    setImportOpen(false);
    await beginImport(shared);
  };

  // Exporta TODAS as fichas num único código (backup/portabilidade).
  const exportAll = async () => {
    if (!plans || plans.length === 0) { toast.error("Nenhuma ficha para exportar."); return; }
    const url = buildPlanShareLink(plans.map((p) => ({ name: p.name, goal: p.goal, divisions: p.divisions })));
    const n = plans.length;
    const text = `Backup de ${n} ficha${n > 1 ? "s" : ""} de treino do Life OS:`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: "Minhas fichas — Life OS", text, url });
        return;
      }
    } catch {
      /* cancelado ou indisponível — cai pro clipboard */
    }
    if (await copyToClipboard(url)) {
      toast.success(`Backup de ${n} ficha${n > 1 ? "s" : ""} copiado! Guarde o link em local seguro.`);
    } else {
      toast.error("Não consegui copiar o backup.");
    }
  };

  const sharePlan = async (plan: WorkoutPlan) => {
    const url = buildPlanShareLink([{ name: plan.name, goal: plan.goal, divisions: plan.divisions }]);
    const text = `Ficha "${plan.name}" (${plan.divisions.length} divisões · ${totalExercises(plan)} exercícios) — abra no Life OS:`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: plan.name, text, url });
        return;
      }
    } catch {
      /* cancelado ou indisponível — cai pro clipboard */
    }
    if (await copyToClipboard(url)) {
      toast.success("Link da ficha copiado — cole no WhatsApp pro seu parceiro de treino!");
    } else {
      toast.error("Não consegui copiar o link.");
    }
  };

  // Compartilha a ficha como IMAGEM (print bonito com os exercícios).
  const sharePlanAsImage = async (plan: WorkoutPlan) => {
    if (totalExercises(plan) === 0) { toast.error("Adicione exercícios antes de gerar a imagem."); return; }
    const t = toast.loading("Gerando imagem da ficha…");
    const res = await sharePlanImage(plan);
    toast.dismiss(t);
    if (res === "shared") toast.success("Imagem pronta pra compartilhar! 💪");
    else if (res === "downloaded") toast.success("Imagem da ficha baixada!");
    else toast.error("Não consegui gerar a imagem.");
  };

  // ---- Helpers de edição (imutáveis) ----
  const patchDraft = (fn: (p: WorkoutPlan) => WorkoutPlan) => setDraft((d) => (d ? fn(d) : d));
  const patchDivision = (divId: string, fn: (d: PlanDivision) => PlanDivision) =>
    patchDraft((p) => ({ ...p, divisions: p.divisions.map((d) => (d.id === divId ? fn(d) : d)) }));
  const patchExercise = (divId: string, exId: string, fn: (e: PlanExercise) => PlanExercise) =>
    patchDivision(divId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const openEditor = (plan: WorkoutPlan) => { setDraft(plan); setActiveDiv(plan.divisions[0]?.id ?? ""); };
  const createNew = () => { const p = newPlan("Nova ficha"); setDraft(p); setActiveDiv(p.divisions[0]?.id ?? ""); };

  // Ficha lida por foto (IA): abre no editor como rascunho novo (id temporário →
  // o primeiro "Salvar" cria o registro). Usuário revisa/ajusta antes de salvar.
  const openImported = (p: ImportedPlan) => {
    const draftPlan: WorkoutPlan = { id: uid("plan"), name: p.name, goal: p.goal, divisions: p.divisions };
    setDraft(draftPlan);
    setActiveDiv(draftPlan.divisions[0]?.id ?? "");
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const res = await saveWorkoutPlan({ id: draft.id, name: draft.name, goal: draft.goal, divisions: draft.divisions });
    setSaving(false);
    if (res.success && res.plan) {
      const saved = res.plan;
      setPlans((prev) => {
        const others = (prev ?? []).filter((p) => p.id !== draft.id && p.id !== saved.id);
        return [saved, ...others];
      });
      setDraft(saved); // adota o id real do banco (próximos saves atualizam)
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteWorkoutPlan(id);
    if (res.success) {
      setPlans((prev) => (prev ?? []).filter((p) => p.id !== id));
      toast.success(res.message);
    } else toast.error(res.message);
  };

  const startDivision = (plan: WorkoutPlan, div: PlanDivision) => {
    if (div.exercises.length === 0) { toast.error("Adicione exercícios a esta divisão primeiro."); return; }
    savePendingStart(divisionToStart(plan, div));
    router.push("/health/gym/session");
  };

  // ============================ EDITOR ============================
  if (draft) {
    const division = draft.divisions.find((d) => d.id === activeDiv) ?? draft.divisions[0];
    const moveDivision = (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= draft.divisions.length) return;
      patchDraft((p) => {
        const copy = [...p.divisions];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return { ...p, divisions: copy };
      });
    };

    return (
      <div className="space-y-5 pb-12">
        {/* Topo do editor */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setDraft(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Minhas fichas
          </button>
          <div className="flex items-center gap-2">
            <Button onClick={() => sharePlanAsImage(draft)} variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Compartilhar como imagem" aria-label="Compartilhar ficha como imagem"><ImageDown className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 gap-1.5 font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar ficha
            </Button>
          </div>
        </div>

        {/* Nome + objetivo */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input value={draft.name} onChange={(e) => patchDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Nome da ficha (ex: Foco Hipertrofia)" className="h-11 text-base font-semibold" />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => patchDraft((p) => ({ ...p, goal: g }))}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  draft.goal === g ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                {PLAN_GOAL_META[g].label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs de divisões (A/B/C) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {draft.divisions.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDiv(d.id)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                d.id === division?.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40",
              )}
            >
              {d.label} <span className="opacity-60">· {d.exercises.length}</span>
              {i === draft.divisions.findIndex((x) => x.id === activeDiv) && draft.divisions.length > 1 && (
                <span className="ml-1 inline-flex gap-0.5">
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); moveDivision(i, -1); }} className="hover:text-foreground"><ArrowUp className="inline h-3 w-3" /></span>
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); moveDivision(i, 1); }} className="hover:text-foreground"><ArrowDown className="inline h-3 w-3" /></span>
                </span>
              )}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1"
            onClick={() => {
              const letter = DIVISION_LETTERS[draft.divisions.length] ?? `${draft.divisions.length + 1}`;
              const nd = newDivision(`Treino ${letter}`);
              patchDraft((p) => ({ ...p, divisions: [...p.divisions, nd] }));
              setActiveDiv(nd.id);
            }}
          >
            <Plus className="h-4 w-4" /> Divisão
          </Button>
        </div>

        {division && (
          <DivisionEditor
            key={division.id}
            division={division}
            canDelete={draft.divisions.length > 1}
            onPatch={(fn) => patchDivision(division.id, fn)}
            onPatchExercise={(exId, fn) => patchExercise(division.id, exId, fn)}
            onDelete={() => {
              patchDraft((p) => ({ ...p, divisions: p.divisions.filter((d) => d.id !== division.id) }));
              setActiveDiv(draft.divisions.find((d) => d.id !== division.id)?.id ?? "");
            }}
            onStart={() => startDivision(draft, division)}
          />
        )}
      </div>
    );
  }

  // ============================ LISTA ============================
  return (
    <div className="space-y-4 pb-12">
      {/* Empilha no mobile: título + 3 botões na mesma linha estouravam um iPhone SE. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold"><ClipboardList className="h-5 w-5 text-primary" /> Fichas de treino</h3>
          <p className="text-xs text-muted-foreground">Monte divisões A/B/C com metas e inicie direto.</p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          {plans && plans.length > 0 && (
            <Button onClick={exportAll} size="sm" variant="outline" className="h-9 flex-1 gap-1.5 text-xs sm:flex-none" title="Exportar todas as fichas (backup)"><Upload className="h-3.5 w-3.5" /> Exportar</Button>
          )}
          <PlanPhotoImport onImported={openImported} />
          <Button onClick={() => setImportOpen((v) => !v)} size="sm" variant="outline" className="h-9 flex-1 gap-1.5 text-xs sm:flex-none"><Download className="h-3.5 w-3.5" /> Importar</Button>
          <Button onClick={createNew} size="sm" className="h-9 flex-1 gap-1.5 font-semibold sm:flex-none"><Plus className="h-4 w-4" /> Nova ficha</Button>
        </div>
      </div>

      {importOpen && (
        <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <ClipboardPaste className="h-3.5 w-3.5 text-primary" /> Colar link/código da ficha
            </span>
            <button type="button" onClick={() => setImportOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            autoFocus
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
            placeholder="Cole aqui o link recebido (ou só o código)…"
            className="h-16 w-full resize-none rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
          />
          <Button type="button" size="sm" className="h-8 w-full gap-1.5 text-xs" onClick={submitImport} disabled={!importValue.trim()}>
            <Download className="h-3.5 w-3.5" /> Importar
          </Button>
        </div>
      )}

      {plans === null ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/5 py-16 text-center">
          <div className="mb-3 rounded-full bg-muted/20 p-3"><Dumbbell className="h-6 w-6 text-muted-foreground/50" /></div>
          <h4 className="text-base font-semibold">Nenhuma ficha ainda</h4>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">Fotografe a ficha que te passaram ou crie do zero (ex: Push/Pull/Legs) com séries, faixas de reps e RIR/RPE.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <PlanPhotoImport onImported={openImported} />
            <Button onClick={createNew} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Criar ficha</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{plan.name}</h4>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{PLAN_GOAL_META[plan.goal].label}</span>
                    {" "}· {plan.divisions.length} divisões · {totalExercises(plan)} exercícios
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => sharePlanAsImage(plan)} title="Compartilhar como imagem" aria-label="Compartilhar ficha como imagem"><ImageDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => sharePlan(plan)} title="Compartilhar link" aria-label="Compartilhar ficha por link"><Share2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditor(plan)} title="Editar" aria-label="Editar ficha"><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" aria-label="Excluir ficha"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir &quot;{plan.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>A ficha e suas divisões serão removidas permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(plan.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {/* Divisões: iniciar com um toque (truncadas p/ nome longo não estourar o card) */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.divisions.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => startDivision(plan, d)}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
                    title={`Iniciar ${d.label}`}
                  >
                    <Play className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conflito de import: nome já existe → substituir / copiar / cancelar */}
      <AlertDialog open={conflicts.length > 0} onOpenChange={(o) => { if (!o) void resolveConflict("cancel"); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Já existe uma ficha &quot;{conflicts[0]?.shared.name}&quot;</AlertDialogTitle>
            <AlertDialogDescription>
              O que você quer fazer com a ficha importada?
              {conflicts.length > 1 && <span className="mt-1 block text-xs">+{conflicts.length - 1} conflito{conflicts.length - 1 > 1 ? "s" : ""} na fila.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Button onClick={() => resolveConflict("replace")} className="h-auto justify-start gap-3 py-2.5 text-left">
              <Save className="h-4 w-4 shrink-0" />
              <span className="flex flex-col"><span className="font-semibold">Substituir</span><span className="text-xs font-normal opacity-80">Sobrescreve a ficha atual (mantém o mesmo registro).</span></span>
            </Button>
            <Button variant="outline" onClick={() => resolveConflict("copy")} className="h-auto justify-start gap-3 py-2.5 text-left">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="flex flex-col"><span className="font-semibold">Criar cópia</span><span className="text-xs font-normal opacity-80">Salva uma nova ficha com &quot; (Cópia)&quot; no nome.</span></span>
            </Button>
            <Button variant="ghost" onClick={() => resolveConflict("cancel")} className="h-9 text-muted-foreground">
              <X className="mr-1.5 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Editor de uma divisão (exercícios + metas) ----
function DivisionEditor({ division, canDelete, onPatch, onPatchExercise, onDelete, onStart }: {
  division: PlanDivision;
  canDelete: boolean;
  onPatch: (fn: (d: PlanDivision) => PlanDivision) => void;
  onPatchExercise: (exId: string, fn: (e: PlanExercise) => PlanExercise) => void;
  onDelete: () => void;
  onStart: () => void;
}) {
  const [newName, setNewName] = useState("");

  const addExercise = () => {
    const name = newName.trim();
    if (!name) return;
    const group = groupOfExercise(name);
    const ex = newPlanExercise(name, group, guessEquipment(name));
    onPatch((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    setNewName("");
  };

  const moveExercise = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= division.exercises.length) return;
    onPatch((d) => {
      const copy = [...d.exercises];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return { ...d, exercises: copy };
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-card/40 p-3">
      {/* Cabeçalho da divisão */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={division.label} onChange={(e) => onPatch((d) => ({ ...d, label: e.target.value }))} placeholder="Nome da divisão (ex: A — Peito/Tríceps)" className="h-9 min-w-0 flex-1 text-sm font-semibold" />
        <Button type="button" size="sm" className="h-9 gap-1.5" onClick={onStart}><Play className="h-4 w-4" /> Iniciar</Button>
        {canDelete && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Excluir divisão" aria-label="Excluir divisão"><Trash2 className="h-4 w-4" /></Button>
        )}
      </div>

      {/* Agenda semanal: em quais dias esta divisão é o treino do dia (opcional).
          A recomendação de "hoje" prioriza a divisão agendada pro dia da semana. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dias</span>
        {WEEKDAY_LABELS.map((label, day) => {
          const active = division.weekdays?.includes(day) ?? false;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPatch((d) => {
                const cur = new Set(d.weekdays ?? []);
                if (cur.has(day)) cur.delete(day); else cur.add(day);
                const weekdays = Array.from(cur).sort((a, b) => a - b);
                return { ...d, weekdays: weekdays.length ? weekdays : undefined };
              })}
              className={cn(
                "rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors",
                active ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40",
              )}
              aria-pressed={active}
              aria-label={`${active ? "Remover de" : "Agendar para"} ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Exercícios */}
      {division.exercises.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">Nenhum exercício. Adicione abaixo.</p>
      ) : (
        <div className="space-y-2">
          {division.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              first={i === 0}
              last={i === division.exercises.length - 1}
              onMove={(dir) => moveExercise(i, dir)}
              onPatch={(fn) => onPatchExercise(ex.id, fn)}
              onRemove={() => onPatch((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== ex.id) }))}
            />
          ))}
        </div>
      )}

      {/* Adicionar exercício */}
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/50 bg-background p-1.5">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExercise(); } }} placeholder="Adicionar exercício… (Enter)" className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0" />
        <Button type="button" size="sm" onClick={addExercise} disabled={!newName.trim()} className="shrink-0 gap-1.5"><Plus className="h-4 w-4" /> Incluir</Button>
      </div>
    </div>
  );
}

// ---- Linha de exercício com editor de META tipada ----
function ExerciseRow({ ex, first, last, onMove, onPatch, onRemove }: {
  ex: PlanExercise;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onPatch: (fn: (e: PlanExercise) => PlanExercise) => void;
  onRemove: () => void;
}) {
  const [showIntensityHelp, setShowIntensityHelp] = useState(false);
  const [mediaEditorOpen, setMediaEditorOpen] = useState(false);
  const t = ex.target;
  const setTarget = (patch: Partial<ExerciseTarget>) => onPatch((e) => ({ ...e, target: { ...e.target, ...patch } }));
  const stepSets = (delta: number) => setTarget({ sets: Math.max(1, Math.min(20, t.sets + delta)) });
  const setIntensity = (type: IntensityType | null) =>
    setTarget({ intensity: type === null ? undefined : { type, value: ex.target.intensity?.value ?? (type === "RPE" ? 8 : 2) } });

  const intensityInfo = {
    RIR: {
      label: "Repetições em Reserva",
      description: "Quanto MAIS você consegue fazer antes de parar?",
      example: "Se você faz 8 reps e ainda conseguiria fazer 2 mais: RIR = 2",
      tooltip: "0 = até o limite | 1-2 = bem intenso | 3-4 = moderado | 5+ = tranquilo"
    },
    RPE: {
      label: "Esforço Percebido",
      description: "Quão CANSATIVA foi a série de 1 a 10?",
      example: "Escala: 1 (muito fácil) até 10 (no limite máximo)",
      tooltip: "6-7 = tranquilo | 7-8 = bom | 8-9 = intenso | 9-10 = máximo"
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 space-y-3">
      {/* Header: imagem + nome + controles */}
      <div className="flex items-start gap-3">
        {/* Thumbnail do exercício — clicável para editar mídia */}
        <button
          type="button"
          onClick={() => setMediaEditorOpen(true)}
          className="relative group h-12 w-12 rounded-lg shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
          title="Clique para editar imagem/vídeo"
        >
          <ExerciseThumb
            name={ex.name}
            group={ex.group}
            size="sm"
            showPlay={false}
            className="h-12 w-12 rounded-lg"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
            <span className="text-white/0 group-hover:text-white/70 text-xs font-bold transition-colors">✎</span>
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => onMove(-1)} disabled={first} className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-3 w-3" /></button>
              <button type="button" onClick={() => onMove(1)} disabled={last} className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30" aria-label="Descer"><ArrowDown className="h-3 w-3" /></button>
            </div>
            <Input value={ex.name} onChange={(e) => onPatch((x) => ({ ...x, name: e.target.value }))} className="h-9 min-w-0 flex-1 text-sm font-medium" />
            {ex.equipment && <span className="hidden shrink-0 rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">{EQUIPMENT_META[ex.equipment].short}</span>}
            <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground/60 hover:text-destructive" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Meta tipada: séries · faixa de reps · intensidade */}
      <div className="space-y-3">
        {/* Linha 1: Séries */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Séries</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background w-fit">
              <button type="button" onClick={() => stepSets(-1)} className="px-2 py-1 text-muted-foreground hover:text-foreground">−</button>
              <span className="min-w-10 text-center font-mono tabular-nums text-sm font-semibold">{t.sets}</span>
              <button type="button" onClick={() => stepSets(1)} className="px-2 py-1 text-muted-foreground hover:text-foreground">+</button>
            </div>
          </div>

          {/* Faixa de reps/tempo */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ex.timed ? "Tempo ⏱" : "Repetições"}
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background px-1.5 py-1 w-fit">
              <input inputMode="numeric" value={String(t.minReps)} onChange={(e) => setTarget({ minReps: Math.max(1, parseInt(e.target.value) || 1) })} className={cn("bg-transparent text-center font-mono outline-none font-semibold", ex.timed ? "w-10" : "w-7")} aria-label={ex.timed ? "Segundos mínimos" : "Reps mínimas"} />
              <span className="text-muted-foreground/60 font-semibold">−</span>
              <input inputMode="numeric" value={String(t.maxReps)} onChange={(e) => setTarget({ maxReps: Math.max(1, parseInt(e.target.value) || 1) })} className={cn("bg-transparent text-center font-mono outline-none font-semibold", ex.timed ? "w-10" : "w-7")} aria-label={ex.timed ? "Segundos máximos" : "Reps máximas"} />
              <button
                type="button"
                onClick={() => onPatch((x) => ({ ...x, timed: x.timed ? undefined : true }))}
                className={cn(
                  "ml-1 px-1 py-0.5 text-[10px] font-bold rounded transition-colors",
                  ex.timed ? "bg-primary/20 text-primary" : "text-muted-foreground/70 hover:text-foreground",
                )}
                title={ex.timed ? "Medindo por TEMPO — toque para repetições" : "Medindo por REPS — toque para tempo"}
              >
                {ex.timed ? "seg" : "reps"}
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: Intensidade com explicação */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Intensidade</span>
            <button
              type="button"
              onClick={() => setShowIntensityHelp(!showIntensityHelp)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
              title="Ver explicação das opções de intensidade"
            >
              {t.intensity ? "? Ajustar" : "? Entender"}
            </button>
          </div>

          {/* Botões RIR/RPE */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-border/50 bg-background">
              {(["RIR", "RPE"] as IntensityType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIntensity(t.intensity?.type === type ? null : type)}
                  className={cn(
                    "px-3 py-1.5 font-semibold text-sm transition-colors border-r border-border/50 last:border-r-0",
                    t.intensity?.type === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={type === "RIR" ? "Repetições que você AINDA consegue fazer" : "Nota de cansaço de 1 a 10"}
                >
                  {type}
                </button>
              ))}
            </div>

            {t.intensity && (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor:</span>
                <input
                  inputMode="numeric"
                  value={String(t.intensity.value)}
                  onChange={(e) => setTarget({ intensity: { type: t.intensity!.type, value: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) } })}
                  className="w-12 h-8 border border-primary/30 bg-primary/5 rounded-lg py-1 text-center font-mono font-bold outline-none focus:border-primary/60 focus:bg-primary/10"
                  aria-label={t.intensity.type === "RIR" ? "Repetições em reserva" : "Esforço percebido"}
                />
              </div>
            )}
          </div>

          {/* Help box com explicação */}
          {showIntensityHelp && (
            <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2.5">
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">🎯 RIR - Repetições em Reserva</h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{intensityInfo.RIR.description}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 italic">Ex: {intensityInfo.RIR.example}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">📊 {intensityInfo.RIR.tooltip}</p>
                </div>
                <div className="border-t border-primary/10 pt-2">
                  <h4 className="font-semibold text-sm text-foreground mb-1">💪 RPE - Esforço Percebido</h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{intensityInfo.RPE.description}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 italic">Ex: {intensityInfo.RPE.example}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">📊 {intensityInfo.RPE.tooltip}</p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/60 pt-1 border-t border-primary/10">
                💡 Escolha <strong>uma</strong> - use aquela que mais faz sentido pra você!
              </div>
            </div>
          )}
        </div>

        {/* Resumo da meta */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/30">
          <TargetIcon className="h-3.5 w-3.5 text-primary" /> <span className="font-medium">{formatTarget(ex.target, ex.timed)}</span>
        </p>
      </div>

      {/* Modal de edição de mídia */}
      <ExerciseMediaEditor
        exerciseName={ex.name}
        open={mediaEditorOpen}
        onOpenChange={setMediaEditorOpen}
      />
    </div>
  );
}
