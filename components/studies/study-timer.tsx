"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  BrainCircuit,
  Lightbulb,
  Zap,
  Timer,
  RotateCcw,
} from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ================================
   TIPOS / CONSTANTES
================================ */
type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO";

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "LEITURA", label: "📖 Leitura" },
  { value: "VIDEO", label: "🎬 Vídeo / Aula" },
  { value: "EXERCICIO", label: "✏️ Exercícios" },
  { value: "REVISAO", label: "🔄 Revisão" },
  { value: "PROJETO", label: "🔨 Projeto" },
];

const STUDY_TIPS = [
  "Explique o conteúdo em voz alta como se estivesse ensinando alguém.",
  "Faça pausas curtas para manter o foco.",
  "Revise o conteúdo em até 24h.",
  "Misture tópicos para fortalecer a memória.",
  "Dormir bem melhora a retenção.",
];

const POMODORO_FOCUS = 25 * 60;
const POMODORO_BREAK = 5 * 60;

interface StudyTimerProps {
  subjects: StudySubject[];
}

/* ================================
   COMPONENTE
================================ */
export function StudyTimer({ subjects }: StudyTimerProps) {
  /* ---------- ESTADOS ---------- */
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [focusLevel, setFocusLevel] = useState("3");
  const [sessionType, setSessionType] = useState<SessionType>("LEITURA");
  const [sessionTags, setSessionTags] = useState("");

  const [activeTip, setActiveTip] = useState(() => {
    const i = Math.floor(Math.random() * STUDY_TIPS.length);
    return STUDY_TIPS[i];
  });

  /* ---------- HELPERS ---------- */
  const formatTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const randomizeTip = () => {
    const i = Math.floor(Math.random() * STUDY_TIPS.length);
    setActiveTip(STUDY_TIPS[i]);
  };

  /* ---------- TIMER ---------- */
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (pomodoroMode) {
          if (prev <= 1) {
            toast.success(
              isBreak
                ? "Pausa encerrada! Hora de focar."
                : "Ciclo concluído! Hora da pausa."
            );

            setIsBreak(!isBreak);
            return isBreak ? POMODORO_FOCUS : POMODORO_BREAK;
          }

          return prev - 1;
        }

        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, pomodoroMode, isBreak]);

  /* ---------- AÇÕES ---------- */
  const handleStart = () => {
    if (pomodoroMode && seconds === 0) {
      setSeconds(POMODORO_FOCUS);
      setIsBreak(false);
    }
    setIsRunning(true);
  };

  const handleReset = () => {
    if (confirm("Deseja zerar o cronômetro?")) {
      setSeconds(0);
      setIsRunning(false);
      setIsBreak(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      toast.error("Selecione uma matéria.");
      return;
    }

    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const loading = toast.loading("Salvando sessão...");

    try {
      const result = await logSession(
        selectedSubject,
        minutes,
        notes,
        focusLevel,
        sessionType,
        sessionTags
      );

      toast.dismiss(loading);

      if (result.success) {
        toast.success(result.message);
        setSeconds(0);
        setIsRunning(false);
        setNotes("");
        setSessionTags("");
        setFocusLevel("3");
        setSessionType("LEITURA");
        setIsDialogOpen(false);
        randomizeTip();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.dismiss(loading);
      toast.error("Erro ao salvar sessão.");
    }
  };

  /* ================================
     RENDER
  ================================ */
  return (
    <Card className="border border-border bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
      <CardContent className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary">
            <BrainCircuit className="h-5 w-5" />
            Laboratório de Foco
          </div>

          <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border">
            <Label className="text-xs text-muted-foreground">Pomodoro</Label>
            <Switch checked={pomodoroMode} onCheckedChange={setPomodoroMode} />
          </div>
        </div>

        {/* TIMER */}
        <div className="text-center space-y-4">
          <div
            className={cn(
              "text-7xl font-mono font-bold",
              isRunning ? "text-primary" : "text-muted-foreground"
            )}
          >
            {formatTime(seconds)}
          </div>

          <p className="text-xs uppercase text-muted-foreground">
            {isBreak ? "Pausa" : "Foco"}
          </p>

          {pomodoroMode && (
            <Progress
              value={
                ((isBreak ? POMODORO_BREAK : POMODORO_FOCUS) - seconds) /
                (isBreak ? POMODORO_BREAK : POMODORO_FOCUS) *
                100
              }
              className="h-2 bg-muted"
            />
          )}

          <div className="flex gap-2 bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" />
            <p className="italic">{activeTip}</p>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="flex gap-3">
          {!isRunning && seconds > 0 && (
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw />
            </Button>
          )}

          {!isRunning ? (
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleStart}
            >
              <Play className="mr-2 h-5 w-5" />
              Iniciar
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsRunning(false)}
            >
              <Pause className="mr-2 h-5 w-5" />
              Pausar
            </Button>
          )}

          {!isRunning && seconds > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 text-white">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Salvar
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Consolidar Sessão</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={focusLevel}
                    onChange={(e) => setFocusLevel(e.target.value)}
                  />

                  <Select
                    value={sessionType}
                    onValueChange={(v) =>
                      setSessionType(v as SessionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Tags"
                    value={sessionTags}
                    onChange={(e) => setSessionTags(e.target.value)}
                  />

                  <Textarea
                    placeholder="Notas da sessão"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  <Button onClick={handleSave} className="w-full">
                    Confirmar e ganhar XP
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
