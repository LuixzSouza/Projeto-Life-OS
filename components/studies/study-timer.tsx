"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  BrainCircuit,
  Lightbulb,
  RotateCcw,
  Target,
  FolderTree,
  Settings,
  Timer,
  Coffee,
  Volume2,
  VolumeX,
  Bell,
  History,
  Award,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Clock,
  Zap,
} from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SelectGroup,
} from "@/components/ui/select";
import {
  Slider,
} from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ================================
   TIPOS / CONSTANTES
================================ */
type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO" | "PRATICA";

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; icon: string }[] = [
  { value: "LEITURA", label: "Leitura", icon: "📖" },
  { value: "VIDEO", label: "Vídeo/Aula", icon: "🎬" },
  { value: "EXERCICIO", label: "Exercícios", icon: "✏️" },
  { value: "REVISAO", label: "Revisão", icon: "🔄" },
  { value: "PROJETO", label: "Projeto", icon: "🔨" },
  { value: "PRATICA", label: "Prática", icon: "🎯" },
];

const POMODORO_PRESETS = {
  CLASSIC: { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60, cycles: 4 },
  DEEP_WORK: { focus: 52 * 60, shortBreak: 17 * 60, longBreak: 30 * 60, cycles: 3 },
  ULTRA_FOCUS: { focus: 90 * 60, shortBreak: 10 * 60, longBreak: 20 * 60, cycles: 2 },
  QUICK: { focus: 15 * 60, shortBreak: 3 * 60, longBreak: 10 * 60, cycles: 5 },
} as const;

const STUDY_TIPS = [
  "Técnica Pomodoro: 25min foco, 5min pausa. Após 4 ciclos, faça uma pausa longa de 15-30min.",
  "Estudo ativo > estudo passivo. Faça perguntas, resuma, explique em voz alta.",
  "Intercale matérias diferentes para evitar fadiga mental.",
  "Revise o conteúdo 24h depois para fixar na memória de longo prazo.",
  "Use a técnica Feynman: explique como se estivesse ensinando uma criança.",
  "Anote dúvidas que surgirem e volte nelas depois para não quebrar o fluxo.",
  "Ambiente organizado = mente organizada. Prepare seu espaço antes de começar.",
  "Hidrate-se! A desidratação reduz a concentração em até 30%.",
  "Respire fundo por 4 segundos, segure por 7, expire por 8. Repita 3x para acalmar.",
  "Reserve os últimos 5 minutos para revisar o que aprendeu na sessão.",
];

type PomodoroPreset = keyof typeof POMODORO_PRESETS;

interface StudyTimerProps {
  subjects: StudySubject[];
}

/* ================================
   COMPONENTE
================================ */
export function StudyTimer({ subjects }: StudyTimerProps) {
  /* ---------- ESTADOS PRINCIPAIS ---------- */
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [totalCompletedSessions, setTotalCompletedSessions] = useState(0);
  
  /* ---------- CONFIGURAÇÕES POMODORO ---------- */
  const [pomodoroPreset, setPomodoroPreset] = useState<PomodoroPreset>("CLASSIC");
  const [customFocusTime, setCustomFocusTime] = useState(25); // minutos
  const [customBreakTime, setCustomBreakTime] = useState(5); // minutos
  const [customLongBreakTime, setCustomLongBreakTime] = useState(15); // minutos
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(4);
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  
  /* ---------- CONFIGURAÇÕES GERAIS ---------- */
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [autoStartFocus, setAutoStartFocus] = useState(false);
  
  /* ---------- ESTADOS DA SESSÃO ---------- */
  const [notes, setNotes] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [focusLevel, setFocusLevel] = useState("3");
  const [sessionType, setSessionType] = useState<SessionType>("LEITURA");
  const [sessionTags, setSessionTags] = useState("");
  const [activeTip, setActiveTip] = useState(() => 
    STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]
  );
  const [showSettings, setShowSettings] = useState(false);
  const [timerHistory, setTimerHistory] = useState<Array<{
    date: Date;
    duration: number;
    subject: string;
    type: SessionType;
  }>>([]);

  /* ---------- CÁLCULOS ---------- */
  const currentSettings = useMemo(() => {
    if (useCustomSettings) {
      return {
        focus: customFocusTime * 60,
        shortBreak: customBreakTime * 60,
        longBreak: customLongBreakTime * 60,
        cycles: cyclesBeforeLongBreak,
      };
    }
    return POMODORO_PRESETS[pomodoroPreset];
  }, [useCustomSettings, pomodoroPreset, customFocusTime, customBreakTime, customLongBreakTime, cyclesBeforeLongBreak]);

  const isLongBreak = useMemo(() => 
    completedCycles > 0 && completedCycles % currentSettings.cycles === 0,
    [completedCycles, currentSettings.cycles]
  );

  const currentTargetTime = useMemo(() => 
    isBreak 
      ? (isLongBreak ? currentSettings.longBreak : currentSettings.shortBreak)
      : currentSettings.focus,
    [isBreak, isLongBreak, currentSettings]
  );

  const progressPercentage = useMemo(() => 
    ((currentTargetTime - seconds) / currentTargetTime) * 100,
    [seconds, currentTargetTime]
  );

  const nextBreakType = useMemo(() => 
    (completedCycles + 1) % currentSettings.cycles === 0 ? "longa" : "curta",
    [completedCycles, currentSettings.cycles]
  );

  /* ---------- EFEITOS ---------- */
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          // Tempo acabou
          if (soundEnabled) {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(() => {
              // Fallback para som do navegador
              const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              const audioContext = new AudioContextClass();
              const oscillator = audioContext.createOscillator();
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator.connect(audioContext.destination);
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.5);
            });
          }

          if (notificationsEnabled && document.hidden) {
            new Notification(isBreak ? "Pausa encerrada! ⏰" : "Tempo de foco completo! 🎯", {
              body: isBreak 
                ? "Hora de voltar ao foco!"
                : `Bom trabalho! Hora de uma pausa ${nextBreakType}.`,
              icon: "/favicon.ico",
            });
          }

          if (isBreak) {
            setIsBreak(false);
            setSeconds(currentSettings.focus);
            if (autoStartFocus) {
              // Auto-start do próximo foco
              setTimeout(() => setIsRunning(true), 1000);
            } else {
              setIsRunning(false);
            }
          } else {
            setIsBreak(true);
            const newCycles = completedCycles + 1;
            setCompletedCycles(newCycles);
            setTotalCompletedSessions(prev => prev + 1);
            
            const breakTime = newCycles % currentSettings.cycles === 0 
              ? currentSettings.longBreak 
              : currentSettings.shortBreak;
            
            setSeconds(breakTime);
            
            if (autoStartBreaks) {
              setTimeout(() => setIsRunning(true), 1000);
            } else {
              setIsRunning(false);
            }
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isBreak, completedCycles, currentSettings, soundEnabled, notificationsEnabled, autoStartBreaks, autoStartFocus, nextBreakType]);

  /* ---------- FUNÇÕES DE FORMATAÇÃO ---------- */
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeForDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /* ---------- HANDLERS ---------- */
  const handleStart = () => {
    if (!selectedSubjectId) {
      toast.error("Selecione um tópico para começar!", {
        description: "Escolha o assunto que você vai estudar",
      });
      return;
    }

    if (seconds === 0) {
      setSeconds(isBreak ? currentTargetTime : currentSettings.focus);
    }

    setIsRunning(true);
    
    toast.success(isBreak ? "Pausa iniciada! ☕" : "Sessão de foco iniciada! 🚀", {
      description: isBreak 
        ? "Descanse um pouco, você merece!"
        : "Foco total nos próximos minutos",
    });
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info("Timer pausado", {
      description: "Pressione play para continuar",
    });
  };

  const handleReset = () => {
    if (confirm("Tem certeza que quer resetar o timer?")) {
      setSeconds(0);
      setIsRunning(false);
      setIsBreak(false);
      toast.info("Timer resetado");
    }
  };

  const handleSkip = () => {
    if (isBreak) {
      setIsBreak(false);
      setSeconds(currentSettings.focus);
      setIsRunning(autoStartFocus);
      toast.info("Pausa pulada", {
        description: "Voltando ao tempo de foco",
      });
    } else {
      setIsBreak(true);
      setCompletedCycles(prev => prev + 1);
      setTotalCompletedSessions(prev => prev + 1);
      setSeconds(currentSettings.shortBreak);
      setIsRunning(autoStartBreaks);
      toast.success("Sessão completada!", {
        description: "Iniciando pausa",
      });
    }
  };

  const handleSaveSession = async () => {
    if (!selectedSubjectId) {
      toast.error("Selecione uma matéria");
      return;
    }

    const durationMinutes = Math.ceil(seconds / 60);
    const loadingToast = toast.loading("Salvando sua sessão...");

    try {
      const result = await logSession(
        selectedSubjectId,
        durationMinutes,
        notes,
        focusLevel,
        sessionType,
        sessionTags
      );

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success("Sessão salva com sucesso! 🎉", {
          description: `+${durationMinutes} XP adicionados`,
        });
        
        // Adicionar ao histórico
        const subject = subjects.find(s => s.id === selectedSubjectId);
        setTimerHistory(prev => [{
          date: new Date(),
          duration: durationMinutes,
          subject: subject?.title || "Desconhecido",
          type: sessionType,
        }, ...prev.slice(0, 4)]);
        
        // Reset
        setSeconds(0);
        setIsRunning(false);
        setIsBreak(false);
        setNotes("");
        setSessionTags("");
        setFocusLevel("3");
        setSessionType("LEITURA");
        setIsSaveDialogOpen(false);
        
        // Nova dica
        setActiveTip(STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]);
      } else {
        toast.error("Erro ao salvar", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro de conexão", {
        description: "Verifique sua internet e tente novamente",
      });
    }
  };

  const handlePresetChange = (preset: PomodoroPreset) => {
    setPomodoroPreset(preset);
    if (!isRunning && !isBreak && seconds === 0) {
      setSeconds(POMODORO_PRESETS[preset].focus);
    }
    toast.info(`Preset alterado: ${preset.replace('_', ' ')}`);
  };

  /* ---------- RENDER ---------- */
  const groupedSubjects = subjects.reduce((acc, subject) => {
    if (!subject.parentId) {
      if (!acc[subject.id]) {
        acc[subject.id] = { parent: subject, children: [] };
      } else {
        acc[subject.id].parent = subject;
      }
    } else {
      if (!acc[subject.parentId]) {
        acc[subject.parentId] = { parent: null, children: [] };
      }
      acc[subject.parentId].children.push(subject);
    }
    return acc;
  }, {} as Record<string, { parent: StudySubject | null; children: StudySubject[] }>);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* HEADER COM STATS */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg">
            <Timer className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Timer de Estudos</h2>
            <p className="text-sm text-muted-foreground">
              {totalCompletedSessions} sessões completadas • {completedCycles} pomodoros hoje
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReset()}
            className="gap-2"
            disabled={seconds === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
        </div>
      </div>

      {/* CONFIGURAÇÕES (ACORDION STYLE) */}
      {showSettings && (
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações do Timer
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                Fechar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PRESETS */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Presets Pomodoro</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(POMODORO_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant={pomodoroPreset === key && !useCustomSettings ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPomodoroPreset(key as PomodoroPreset);
                        setUseCustomSettings(false);
                      }}
                      className="justify-start h-auto py-3"
                    >
                      <div className="text-left">
                        <div className="font-medium">{key.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground">
                          {preset.focus / 60}min • {preset.shortBreak / 60}min
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* CONFIGURAÇÕES PERSONALIZADAS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Personalizado</Label>
                  <Switch
                    checked={useCustomSettings}
                    onCheckedChange={setUseCustomSettings}
                  />
                </div>
                
                {useCustomSettings && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Foco: {customFocusTime}min</Label>
                      <Slider
                        min={5}
                        max={120}
                        step={5}
                        value={[customFocusTime]}
                        onValueChange={([value]) => setCustomFocusTime(value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Pausa: {customBreakTime}min</Label>
                      <Slider
                        min={1}
                        max={30}
                        step={1}
                        value={[customBreakTime]}
                        onValueChange={([value]) => setCustomBreakTime(value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Ciclos até pausa longa: {cyclesBeforeLongBreak}</Label>
                      <Slider
                        min={1}
                        max={8}
                        step={1}
                        value={[cyclesBeforeLongBreak]}
                        onValueChange={([value]) => setCyclesBeforeLongBreak(value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OPÇÕES ADICIONAIS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  id="sound-switch"
                />
                <Label htmlFor="sound-switch" className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Som
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  id="notifications-switch"
                />
                <Label htmlFor="notifications-switch" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoStartBreaks}
                  onCheckedChange={setAutoStartBreaks}
                  id="auto-break-switch"
                />
                <Label htmlFor="auto-break-switch" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  Auto-pausa
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoStartFocus}
                  onCheckedChange={setAutoStartFocus}
                  id="auto-focus-switch"
                />
                <Label htmlFor="auto-focus-switch" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-foco
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TIMER PRINCIPAL */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA - TIMER VISUAL */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="p-8">
            {/* DISPLAY DO TIMER */}
            <div className="text-center space-y-6">
              {/* BADGE DE STATUS */}
              <div className="flex justify-center">
                <Badge
                  variant={isBreak ? "outline" : "primary"}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold animate-pulse",
                    isBreak 
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {isBreak ? (
                    <>
                      <Coffee className="h-4 w-4 mr-2" />
                      {isLongBreak ? "PAUSA LONGA" : "PAUSA CURTA"}
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="h-4 w-4 mr-2" />
                      MODO FOCUS
                    </>
                  )}
                </Badge>
              </div>

              {/* TIMER CIRCULAR (SIMULADO) */}
              <div className="relative mx-auto w-64 h-64">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="text-6xl font-bold font-mono tracking-tighter">
                      {formatTimeForDisplay(seconds)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {isBreak ? "Relaxe um pouco" : "Foco total"}
                    </div>
                  </div>
                </div>
                
                {/* PROGRESS RING SIMULADO */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/20"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progressPercentage / 100)}
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      isBreak ? "text-emerald-500" : "text-primary"
                    )}
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* INFORMAÇÕES DO CICLO */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <div className="text-2xl font-bold">{completedCycles}</div>
                  <div className="text-xs text-muted-foreground">Ciclos</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <div className="text-2xl font-bold">
                    {completedCycles % currentSettings.cycles || currentSettings.cycles}
                  </div>
                  <div className="text-xs text-muted-foreground">Ciclo atual</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <div className="text-2xl font-bold">
                    {isLongBreak ? currentSettings.longBreak / 60 : currentSettings.shortBreak / 60}
                  </div>
                  <div className="text-xs text-muted-foreground">Pausa (min)</div>
                </div>
              </div>

              {/* CONTROLES PRINCIPAIS */}
              <div className="flex gap-3 justify-center pt-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkip}
                  disabled={!isRunning && seconds === 0}
                  className="gap-2"
                >
                  <ChevronRight className="h-5 w-5" />
                  Pular
                </Button>
                
                {isRunning ? (
                  <Button
                    size="lg"
                    onClick={handlePause}
                    className="gap-2 px-8 bg-destructive hover:bg-destructive/90"
                  >
                    <Pause className="h-5 w-5" />
                    Pausar
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!selectedSubjectId}
                    className={cn(
                      "gap-2 px-8",
                      !selectedSubjectId && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Play className="h-5 w-5" />
                    {seconds === 0 ? "Começar" : "Continuar"}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={seconds === 0 || isRunning}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COLUNA DIREITA - CONTROLES E INFORMAÇÕES */}
        <div className="space-y-6">
          {/* SELEÇÃO DE MATÉRIA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                O que estudar?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um tópico" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedSubjects).map(([parentId, group]) => (
                    <SelectGroup key={parentId}>
                      {group.parent && (
                        <SelectItem value={group.parent.id} className="font-semibold">
                          <div className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4" />
                            {group.parent.title}
                          </div>
                        </SelectItem>
                      )}
                      {group.children.map(child => (
                        <SelectItem key={child.id} value={child.id} className="pl-8">
                          <ChevronRight className="h-3 w-3 inline mr-2 opacity-50" />
                          {child.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedSubject && (
                <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedSubject.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedSubject.difficulty}/5 dificuldade
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta: {selectedSubject.goalMinutes} minutos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* DICA DO DIA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Dica de Estudo
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => setActiveTip(STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)])}
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
              <CardContent>
                <span 
                  className="text-sm text-muted-foreground italic"
                  suppressHydrationWarning={true}
                >
                  &quot;{activeTip}&quot;
                </span>
              </CardContent>
          </Card>

          {/* HISTÓRICO RÁPIDO */}
          {timerHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico Hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {timerHistory.map((session, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 rounded hover:bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{session.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {session.duration}min
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOG DE SALVAR SESSÃO */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Salvar Sessão de Estudo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nível de Foco (1-5)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <Button
                      key={level}
                      type="button"
                      variant={focusLevel === level.toString() ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setFocusLevel(level.toString())}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de Sessão</Label>
                <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Tags (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: hooks, api, deploy, algoritmo"
                value={sessionTags}
                onChange={(e) => setSessionTags(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">O que você aprendeu? (Opcional)</Label>
              <Textarea
                placeholder="Anote os principais pontos aprendidos, insights ou dúvidas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            <div className="bg-secondary/50 p-3 rounded-lg">
              <div className="text-sm font-medium">Resumo da Sessão</div>
              <div className="text-xs text-muted-foreground mt-1">
                • Duração: {Math.ceil(seconds / 60)} minutos<br/>
                • Matéria: {selectedSubject?.title || "Não selecionada"}<br/>
                • XP ganho: {Math.ceil(seconds / 60)} pontos
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSaveDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSession}
                className="flex-1 bg-gradient-to-r from-primary to-primary"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar e Ganhar XP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}