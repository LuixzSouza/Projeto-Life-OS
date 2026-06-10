"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveGymSession, saveWorkoutPhotos, saveWorkoutPlan } from "@/app/(dashboard)/health/actions";
import { SessionSetup } from "./session-setup";
import { SessionActive, type SessionControls } from "./session-active";
import { SessionSummary } from "./session-summary";
import { useActiveSession } from "./use-active-session";
import { loadRoutines, saveRoutines, loadPendingStart, clearPendingStart } from "./session-storage";
import { decodeRoutines } from "./routine-share";
import type { SharedPlan } from "./plan-share";
import type { WorkoutPlan } from "./plan-types";
import { enqueueGymSession } from "./mutation-queue";
import { addGalleryPhotos } from "./gym-gallery";
import { handleSpotifyCallback } from "./spotify";
import { sessionStats, toStoredExercises, elapsedSeconds, uid, type ExerciseHistoryPoint, type LastPerf, type Routine, type SaveGymSessionInput } from "./session-types";

// Acima deste tempo sem mexer, um treino em andamento é tratado como "obsoleto"
// (abandonado) e o app pergunta se quer retomar ou descartar.
const STALE_MS = 6 * 60 * 60 * 1000; // 6 horas

function formatAgo(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} dia${days > 1 ? "s" : ""}`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours} hora${hours > 1 ? "s" : ""}`;
}

/**
 * Sessão de treino ao vivo — overlay em tela cheia (isola a tela durante o treino).
 * Três fases: preparar (setup) → treinar (active) → resumo (summary). A sessão fica
 * persistida no localStorage, então sobrevive a refresh/navegação até ser salva.
 */
export function LiveSession({
  lastPerf,
  volumeHistory = {},
  plans: initialPlans = [],
}: {
  lastPerf: LastPerf[];
  volumeHistory?: Record<string, ExerciseHistoryPoint[]>;
  plans?: WorkoutPlan[];
}) {
  const router = useRouter();
  const s = useActiveSession();
  // Init lazy: lê o localStorage uma vez (só renderiza após hidratar a sessão).
  const [routines, setRoutines] = useState<Routine[]>(loadRoutines);
  // Fichas do BANCO (sincronizam entre aparelhos); rotinas ficam só no localStorage.
  const [plans, setPlans] = useState<WorkoutPlan[]>(initialPlans);
  const [saving, startSave] = useTransition();

  // --- Sessão obsoleta (stale): detecta treino abandonado e oferece retomar/descartar ---
  const [stalePrompt, setStalePrompt] = useState<string | null>(null);
  const [staleHandled, setStaleHandled] = useState(false);
  useEffect(() => {
    if (!s.hydrated) return;
    const sess = s.session;
    if (!sess || sess.finishedAt) return;
    const ageMs = Date.now() - (sess.updatedAt ?? sess.startedAt);
    if (ageMs <= STALE_MS) return;
    // Cálculo pontual (idade da sessão) só após hidratar — guardado, não é loop.
    setStalePrompt(formatAgo(ageMs));
  }, [s.hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastPerfMap = useMemo(
    () => Object.fromEntries(lastPerf.map((p) => [p.name.toLowerCase(), p])) as Record<string, LastPerf>,
    [lastPerf],
  );

  const controls: SessionControls = useMemo(() => ({
    renameExercise: s.renameExercise,
    replaceExercise: s.replaceExercise,
    setExerciseEquipment: s.setExerciseEquipment,
    setRestSeconds: s.setRestSeconds,
    addExercise: s.addExercise,
    removeExercise: s.removeExercise,
    addSet: s.addSet,
    removeSet: s.removeSet,
    updateSet: s.updateSet,
    toggleSetDone: s.toggleSetDone,
    setSetType: s.setSetType,
  }), [s.renameExercise, s.replaceExercise, s.setExerciseEquipment, s.setRestSeconds, s.addExercise, s.removeExercise, s.addSet, s.removeSet, s.updateSet, s.toggleSetDone, s.setSetType]);

  // "Iniciar" a partir de uma Ficha (builder) deixa a divisão escolhida no
  // pending-start; ao abrir a sessão sem treino ativo, dispara automaticamente.
  useEffect(() => {
    if (!s.hydrated || s.session) return;
    const pending = loadPendingStart();
    if (pending) {
      clearPendingStart();
      s.start(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hydrated]);

  // Mescla rotinas importadas (de um amigo): mesma-nome é substituída pela nova.
  const handleImportRoutines = (imported: Routine[]) => {
    const names = new Set(imported.map((r) => r.name.toLowerCase()));
    setRoutines((prev) => {
      const merged = [...imported, ...prev.filter((r) => !names.has(r.name.toLowerCase()))];
      saveRoutines(merged);
      return merged;
    });
  };

  // Importa FICHAS (código do construtor de fichas) direto pelo "Treinar agora":
  // salva no banco (mesma-nome sobrescreve, como nas rotinas) e já lista aqui.
  const handleImportPlans = async (shared: SharedPlan[]) => {
    let saved = 0;
    for (const sp of shared) {
      const existing = plans.find((p) => p.name.toLowerCase() === sp.name.toLowerCase());
      try {
        const res = await saveWorkoutPlan({ id: existing?.id, name: sp.name, goal: sp.goal, divisions: sp.divisions });
        if (res.success && res.plan) {
          const plan = res.plan;
          setPlans((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)]);
          saved++;
        }
      } catch {
        /* rede falhou — o toast de erro abaixo cobre */
      }
    }
    if (saved > 0) toast.success(`${saved} ficha${saved > 1 ? "s" : ""} importada${saved > 1 ? "s" : ""}! 🎉`);
    else toast.error("Não consegui salvar a ficha importada. Verifique a conexão.");
  };

  // Retorno do consentimento do Spotify (?code&state) — troca por token e limpa a URL.
  useEffect(() => {
    void handleSpotifyCallback().then((ok) => {
      if (!ok) return;
      toast.success("Spotify conectado! Abra o botão de música para controlar. 🎧");
      router.replace("/health/gym/session");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Import via LINK (?import=<base64>): amigo manda no WhatsApp e cai direto aqui.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("import");
    if (!code) return;
    const imported = decodeRoutines(code);
    params.delete("import"); // limpa pra não reimportar no refresh
    const qs = params.toString();
    router.replace(`/health/gym/session${qs ? `?${qs}` : ""}`);
    if (imported) {
      handleImportRoutines(imported);
      toast.success(`${imported.length} rotina${imported.length > 1 ? "s" : ""} importada${imported.length > 1 ? "s" : ""} do link! 🎉`);
    } else {
      toast.error("O link de rotina recebido é inválido.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRoutine = (name: string) => {
    if (!s.session) return;
    const routine: Routine = {
      id: uid("rt"),
      name: name.trim(),
      muscleGroups: s.session.muscleGroups,
      exercises: s.session.exercises
        .filter((e) => e.name.trim())
        .map((e) => ({ name: e.name.trim(), group: e.group, sets: e.sets.length, reps: e.sets[0]?.reps || "12", weight: e.sets[0]?.weight || "" })),
    };
    const next = [routine, ...routines.filter((r) => r.name.toLowerCase() !== routine.name.toLowerCase())];
    setRoutines(next);
    saveRoutines(next);
    toast.success("Rotina salva!");
  };

  const handleSave = (feeling: string | null, notes: string | null, photos: string[]) => {
    if (!s.session) return;
    const session = s.session;
    // Duração honesta: desconta o tempo pausado (cronômetro congelado não conta).
    const durationMin = Math.round(elapsedSeconds(session, session.finishedAt ?? Date.now()) / 60);
    // Local do treino (GPS) registrado na sessão vira um link de mapa nas notas.
    const locationLine = session.location
      ? `📍 Local: https://maps.google.com/?q=${session.location.lat.toFixed(6)},${session.location.lng.toFixed(6)}`
      : null;
    const finalNotes = [notes?.trim() || null, locationLine].filter(Boolean).join("\n") || null;
    const input: SaveGymSessionInput = {
      title: session.title,
      muscleGroups: session.muscleGroups,
      durationMin,
      feeling,
      notes: finalNotes,
      exercises: toStoredExercises(session.exercises),
    };
    // Fotos vão pro BANCO (sincronizam entre aparelhos via Turso). Se a rede falhar,
    // caem no IndexedDB local e a galeria as sobe sozinha quando voltar a conexão.
    const persistPhotos = async () => {
      if (photos.length === 0) return;
      const stats = sessionStats(session.exercises);
      const dateISO = new Date(session.startedAt).toISOString();
      try {
        const res = await saveWorkoutPhotos(photos.map((dataUrl) => ({
          dataUrl, title: session.title, date: dateISO,
          volume: stats.volume, durationMin, sets: stats.doneSets,
        })));
        if (!res.success) throw new Error(res.message);
      } catch {
        await addGalleryPhotos(photos.map((dataUrl) => ({
          id: uid("ph"), dataUrl, date: dateISO, title: session.title,
          volume: stats.volume, durationMin, sets: stats.doneSets,
        })));
      }
    };

    startSave(async () => {
      try {
        const res = await saveGymSession(input);
        if (res.success) {
          await persistPhotos();
          s.cancel(); // limpa o rascunho local
          toast.success(res.message);
          router.push("/health/gym");
          router.refresh();
        } else {
          // Falha lógica do servidor (ex.: sessão expirada) — NÃO enfileira (evita loop).
          toast.error(res.message);
        }
      } catch {
        // Falha de REDE no encerramento (Wi-Fi da academia oscilou): não perde o treino.
        // Guarda o payload na fila offline e libera a UI; sincroniza quando voltar a rede.
        await persistPhotos();
        enqueueGymSession(input);
        s.cancel();
        toast.success("Sem conexão — treino salvo no aparelho e será sincronizado sozinho.", { duration: 6000 });
        router.push("/health/gym");
        router.refresh();
      }
    });
  };

  // Evita flash/mismatch antes de hidratar o localStorage.
  if (!s.hydrated) {
    return <div className="fixed inset-0 z-[60] bg-background" />;
  }

  // Prompt de sessão obsoleta — antes de tudo (retomar ou descartar).
  if (stalePrompt && !staleHandled && s.session && !s.session.finishedAt) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 text-center shadow-xl">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold">Treino incompleto encontrado</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Você tem um treino <span className="font-semibold text-foreground">“{s.session.title}”</span> parado há {stalePrompt}. Deseja retomar de onde parou ou descartar?
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => { s.touch(); setStaleHandled(true); }} className="h-12 gap-2 text-base font-bold">
              <Play className="h-5 w-5" /> Retomar treino
            </Button>
            <Button
              variant="ghost"
              onClick={() => { s.cancel(); setStaleHandled(true); }}
              className="h-11 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Descartar e começar do zero
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      {!s.session ? (
        <SessionSetup
          routines={routines}
          plans={plans}
          onStart={s.start}
          onClose={() => router.push("/health/gym")}
          onImportRoutines={handleImportRoutines}
          onImportPlans={handleImportPlans}
        />
      ) : s.session.finishedAt ? (
        <SessionSummary
          session={s.session}
          lastPerf={lastPerfMap}
          saving={saving}
          onSave={handleSave}
          onSaveRoutine={handleSaveRoutine}
          onBack={s.reopen}
        />
      ) : (
        <SessionActive
          session={s.session}
          lastPerf={lastPerfMap}
          volumeHistory={volumeHistory}
          controls={controls}
          onFinish={s.finish}
          onCancel={() => { s.cancel(); router.push("/health/gym"); }}
          onPause={() => { s.touch(); router.push("/health/gym"); }}
          onTogglePause={s.togglePause}
          onEndWarmup={s.endWarmup}
          onExtendWarmup={s.extendWarmup}
          onSetLocation={s.setLocation}
        />
      )}
    </div>
  );
}
