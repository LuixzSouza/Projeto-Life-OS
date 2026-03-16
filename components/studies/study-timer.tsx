"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play, Pause, CheckCircle2, BrainCircuit, Lightbulb, RotateCcw,
  Target, FolderTree, Settings, Timer, Coffee, Volume2, VolumeX,
  Bell, History, Award, ChevronRight, Clock, X,
  PenTool, EyeOff, Eye, AlertTriangle, Sparkles,
  Zap
} from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

type PomodoroPreset = keyof typeof POMODORO_PRESETS;

const STUDY_TIPS = [
  "Técnica Pomodoro: 25min foco, 5min pausa. Após 4 ciclos, faça uma pausa longa.",
  "Estudo ativo > estudo passivo. Faça perguntas, resuma, explique em voz alta.",
  "Intercale matérias diferentes para evitar fadiga mental.",
  "Revise o conteúdo 24h depois para fixar na memória de longo prazo.",
  "Use a técnica Feynman: explique como se estivesse ensinando uma criança.",
  "Beba água! A desidratação reduz a concentração em até 30%.",
];

/* ================================
   COMPONENTE 1: MODO FOCO (MODAL IMERSIVO)
================================ */
interface FocusModeModalProps {
  isOpen: boolean;
  subject: StudySubject | null;
  settings: { focus: number; shortBreak: number; longBreak: number; cycles: number };
  preferences: { sound: boolean; notif: boolean; autoBreak: boolean; autoFocus: boolean };
  onFinish: (totalFocusSeconds: number, liveNotes: string) => void;
  onAbort: () => void;
}

function FocusModeModal({ isOpen, subject, settings, preferences, onFinish, onAbort }: FocusModeModalProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [isBreak, setIsBreak] = useState(false);
  const [seconds, setSeconds] = useState(settings.focus);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [totalFocusElapsed, setTotalFocusElapsed] = useState(0); 
  const [liveNotes, setLiveNotes] = useState("");
  
  const [isTimerHidden, setIsTimerHidden] = useState(false);
  
  // 🟢 A grande mudança: A confirmação de saída é um Estado da View, não um modal sobreposto!
  const [viewMode, setViewMode] = useState<"FOCUS" | "CONFIRM_EXIT">("FOCUS");

  const isLongBreak = completedCycles > 0 && completedCycles % settings.cycles === 0;
  const currentTargetTime = isBreak ? (isLongBreak ? settings.longBreak : settings.shortBreak) : settings.focus;
  const progressPercentage = ((currentTargetTime - seconds) / currentTargetTime) * 100;

  useEffect(() => {
    if (!isRunning || viewMode === "CONFIRM_EXIT") return; // Pausa no background se estiver na tela de saída

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (preferences.sound) {
            try {
                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (AudioCtx) {
                    const audioContext = new AudioCtx();
                    const oscillator = audioContext.createOscillator();
                    oscillator.frequency.setValueAtTime(isBreak ? 600 : 800, audioContext.currentTime);
                    oscillator.connect(audioContext.destination);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.5);
                }
            } catch (e) { /* Abafa erro de autoplay bloqueado pelo navegador */ }
          }

          if (isBreak) {
            setIsBreak(false);
            setSeconds(settings.focus);
            setIsRunning(preferences.autoFocus);
          } else {
            const newCycles = completedCycles + 1;
            setTotalFocusElapsed(curr => curr + settings.focus);
            setCompletedCycles(newCycles);
            setIsBreak(true);
            setSeconds(newCycles % settings.cycles === 0 ? settings.longBreak : settings.shortBreak);
            setIsRunning(preferences.autoBreak);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isBreak, completedCycles, settings, preferences, viewMode]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleManualSkip = () => {
    if (isBreak) {
      setIsBreak(false);
      setSeconds(settings.focus);
      setIsRunning(true);
    } else {
      setTotalFocusElapsed(curr => curr + (settings.focus - seconds));
      const newCycles = completedCycles + 1;
      setCompletedCycles(newCycles);
      setIsBreak(true);
      setSeconds(newCycles % settings.cycles === 0 ? settings.longBreak : settings.shortBreak);
      setIsRunning(true);
    }
  };

  const handleFinish = () => {
    const finalElapsed = isBreak ? totalFocusElapsed : totalFocusElapsed + (settings.focus - seconds);
    setIsRunning(false);
    onFinish(finalElapsed, liveNotes);
  };

  const handleAttemptExit = () => {
    setIsRunning(false);
    setViewMode("CONFIRM_EXIT");
  };

  const handleResumeFromExit = () => {
    setViewMode("FOCUS");
    setIsRunning(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleAttemptExit(); }}>
      {/* Container principal flexível com restrição estrita de altura */}
      <DialogContent 
          className="max-w-[95vw] w-full max-h-[95vh] h-full md:h-[85vh] p-0 overflow-hidden border-border/50 shadow-2xl [&>button]:hidden flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => { e.preventDefault(); handleAttemptExit(); }}
      >
          <DialogHeader className="sr-only">
              <DialogTitle>Modo Foco</DialogTitle>
              <DialogDescription>Concentre-se nos estudos.</DialogDescription>
          </DialogHeader>

          {/* 🟢 SUBSTITUIÇÃO DE VIEW (Garante que o layout não quebre) */}
          {viewMode === "CONFIRM_EXIT" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="h-24 w-24 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-6 ring-8 ring-destructive/5">
                      <AlertTriangle className="h-12 w-12" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Tem certeza?</h2>
                  <p className="text-muted-foreground mb-10 max-w-md text-lg">
                      Se você sair agora, todo o progresso do seu ciclo atual <strong>será perdido</strong> e não irá para o seu histórico.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                      <Button variant="outline" size="lg" className="flex-1 h-14 text-base" onClick={handleResumeFromExit}>
                          Voltar ao Foco
                      </Button>
                      <Button variant="destructive" size="lg" className="flex-1 h-14 text-base" onClick={onAbort}>
                          Sair sem salvar
                      </Button>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col md:flex-row h-full w-full overflow-hidden animate-in fade-in duration-300">
                  {/* ESQUERDA: TIMER GIGANTE */}
                  <div className="w-full md:w-1/2 bg-gradient-to-br from-primary/10 via-background to-background flex flex-col items-center justify-center p-6 md:p-8 relative border-b md:border-b-0 md:border-r border-border/40 shrink-0">
                  
                    <div className="absolute top-4 left-6 right-4 flex justify-between items-start">
                        <div>
                            <Badge variant={isBreak ? "outline" : "primary"} className={cn("px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider", isBreak && "text-emerald-500 border-emerald-500/30")}>
                            {isBreak ? <Coffee className="w-3 h-3 mr-2" /> : <BrainCircuit className="w-3 h-3 mr-2" />}
                            {isBreak ? (isLongBreak ? "Pausa Longa" : "Pausa Curta") : "Sessão de Foco"}
                            </Badge>
                            <h3 className="mt-3 text-lg md:text-xl font-bold line-clamp-1">{subject?.title}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">Ciclo: {completedCycles % settings.cycles || settings.cycles} de {settings.cycles}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleAttemptExit} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Container fixo para o relógio (evita que a tela pule) */}
                    <div className="relative w-56 h-56 md:w-72 md:h-72 my-8 flex items-center justify-center shrink-0">
                        {!isTimerHidden && (
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90 transition-opacity">
                                <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted/20" />
                                <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent"
                                    strokeDasharray="283%" // Aproximação de 2 * PI * 45
                                    strokeDashoffset={`${283 * (1 - progressPercentage / 100)}%`}
                                    className={cn("transition-all duration-1000 ease-linear", isBreak ? "text-emerald-500" : "text-primary")}
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                        
                        {/* 🟢 O MODO ZEN APRIMORADO */}
                        {isTimerHidden ? (
                            <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                                <div className="p-6 rounded-full bg-primary/5 mb-4 animate-pulse">
                                    <BrainCircuit className="h-16 w-16 text-primary/70" />
                                </div>
                                <span className="text-sm font-bold tracking-widest uppercase text-primary/70">Foco Profundo</span>
                                <span className="text-[10px] text-muted-foreground mt-2">O tempo está rodando...</span>
                            </div>
                        ) : (
                            <div className="text-6xl md:text-7xl font-black font-mono tracking-tighter tabular-nums text-foreground animate-in fade-in">
                                {formatTime(seconds)}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-3">
                            <Button size="lg" onClick={() => setIsRunning(!isRunning)} className={cn("h-12 md:h-14 px-6 md:px-8 rounded-full shadow-lg transition-all", !isRunning ? "bg-primary" : "bg-destructive hover:bg-destructive/90")}>
                                {isRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                                {isRunning ? "Pausar" : "Continuar"}
                            </Button>
                            <Button size="lg" variant="outline" onClick={handleManualSkip} className="h-12 w-12 md:h-14 md:w-14 p-0 rounded-full" title="Pular fase atual">
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsTimerHidden(!isTimerHidden)} className="text-muted-foreground text-xs mt-2 hover:bg-transparent hover:text-foreground">
                            {isTimerHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                            {isTimerHidden ? "Mostrar Tempo" : "Modo Zen (Ocultar)"}
                        </Button>
                    </div>
                  </div>

                  {/* DIREITA: CADERNO DE ANOTAÇÕES */}
                  {/* min-h-0 é o segredo do flexbox para a Textarea não estourar a tela! */}
                  <div className="w-full md:w-1/2 flex flex-col h-full min-h-0 bg-card">
                      <div className="p-4 md:p-6 border-b border-border/40 flex items-center gap-3 shrink-0 bg-muted/10">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary hidden md:block"><PenTool className="h-5 w-5" /></div>
                          <div>
                              <h3 className="font-bold text-sm md:text-base">Caderno ao Vivo</h3>
                              <p className="text-[10px] md:text-xs text-muted-foreground">Anote insights sem perder o foco.</p>
                          </div>
                      </div>
                      
                      {/* Área flexível que empurra o rodapé para baixo */}
                      <div className="flex-1 p-4 md:p-6 min-h-0">
                          <Textarea 
                              value={liveNotes}
                              onChange={(e) => setLiveNotes(e.target.value)}
                              placeholder="Faça seus resumos aqui. O que você está aprendendo agora?"
                              className="w-full h-full resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm md:text-base leading-relaxed p-0 placeholder:text-muted-foreground/40"
                          />
                      </div>

                      <div className="p-4 md:p-6 border-t border-border/40 bg-muted/10 flex justify-between items-center shrink-0">
                          <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5"/> 
                              <span className="hidden md:inline">Tempo focado:</span> 
                              <strong className="text-foreground">{Math.floor((totalFocusElapsed + (isBreak ? 0 : settings.focus - seconds)) / 60)}min</strong>
                          </p>
                          <Button onClick={handleFinish} size="sm" className="bg-gradient-to-r from-primary to-primary shadow-lg shadow-primary/20 gap-2 h-10 md:h-11 px-4 md:px-6">
                              <CheckCircle2 className="h-4 w-4" /> Finalizar Sessão
                          </Button>
                      </div>
                  </div>
              </div>
          )}
      </DialogContent>
    </Dialog>
  );
}

/* ================================
   COMPONENTE 2: PAINEL PRINCIPAL
================================ */
export function StudyTimer({ subjects }: { subjects: StudySubject[] }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [pomodoroPreset, setPomodoroPreset] = useState<PomodoroPreset>("CLASSIC");
  
  const [preferences, setPreferences] = useState({ sound: true, notif: true, autoBreak: true, autoFocus: false });
  
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(0);
  const [focusLevel, setFocusLevel] = useState("4");
  const [sessionType, setSessionType] = useState<SessionType>("LEITURA");
  const [sessionTags, setSessionTags] = useState("");
  const [activeTip, setActiveTip] = useState(STUDY_TIPS[0]);

  useEffect(() => {
      const interval = setInterval(() => {
          setActiveTip(STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]);
      }, 15000); 
      return () => clearInterval(interval);
  }, []);

  const groupedSubjects = subjects.reduce((acc, subject) => {
    if (!subject.parentId) {
      if (!acc[subject.id]) acc[subject.id] = { parent: subject, children: [] };
      else acc[subject.id].parent = subject;
    } else {
      if (!acc[subject.parentId]) acc[subject.parentId] = { parent: null, children: [] };
      acc[subject.parentId].children.push(subject);
    }
    return acc;
  }, {} as Record<string, { parent: StudySubject | null; children: StudySubject[] }>);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || null;

  const handleFocusFinish = (totalSeconds: number, liveNotes: string) => {
    setIsFocusModeOpen(false);
    setSessionDurationMinutes(Math.max(1, Math.floor(totalSeconds / 60))); 
    setSessionNotes(liveNotes);
    setIsSaveDialogOpen(true); 
  };

  const handleSaveSession = async () => {
    const loadingToast = toast.loading("Salvando e calculando XP...");
    try {
      const result = await logSession(selectedSubjectId, sessionDurationMinutes, sessionNotes, focusLevel, sessionType, sessionTags);
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success("Evolução registrada! 🎉", { description: `+${sessionDurationMinutes * 10} XP ganhos!` });
        setIsSaveDialogOpen(false);
        setSessionNotes("");
        setSessionTags("");
        setFocusLevel("4");
      } else {
        toast.error("Erro ao salvar", { description: result.message });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro de conexão");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 🟢 Renderização segura do Modal */}
      {isFocusModeOpen && (
        <FocusModeModal 
            isOpen={isFocusModeOpen}
            subject={selectedSubject}
            settings={POMODORO_PRESETS[pomodoroPreset]}
            preferences={preferences}
            onFinish={handleFocusFinish}
            onAbort={() => setIsFocusModeOpen(false)}
        />
      )}

      <Card className="border-border/50 bg-card shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-1">Sala de Preparação</h2>
                        <p className="text-sm text-muted-foreground">Escolha a matéria, ajuste o ambiente e entre no modo foco profundo.</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">O que vamos estudar?</Label>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger className="h-14 text-base bg-muted/30 border-border/60">
                                <SelectValue placeholder="Selecione um tópico ou matéria" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(groupedSubjects).map(([parentId, group]) => (
                                    <SelectGroup key={parentId}>
                                    {group.parent && (
                                        <SelectItem value={group.parent.id} className="font-bold py-3"><FolderTree className="h-4 w-4 inline mr-2" />{group.parent.title}</SelectItem>
                                    )}
                                    {group.children.map(child => (
                                        <SelectItem key={child.id} value={child.id} className="pl-8 py-2"><ChevronRight className="h-3 w-3 inline mr-2 opacity-50" />{child.title}</SelectItem>
                                    ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button 
                        size="lg" 
                        onClick={() => selectedSubjectId ? setIsFocusModeOpen(true) : toast.error("Selecione uma matéria primeiro!")}
                        className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        <Play className="h-5 w-5 mr-2" /> Iniciar Modo Foco
                    </Button>
                </div>

                <div className="w-full md:w-1/3 space-y-6 md:pl-8 md:border-l border-border/40">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Técnica</Label>
                            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                                <Settings className="h-3.5 w-3.5 mr-2" /> Preferências
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(POMODORO_PRESETS).map(([key, preset]) => (
                                <Button
                                    key={key}
                                    variant={pomodoroPreset === key ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPomodoroPreset(key as PomodoroPreset)}
                                    className={cn("h-auto py-2 px-3 justify-start flex-col items-start gap-1", pomodoroPreset === key && "shadow-sm bg-primary")}
                                >
                                    <span className="font-semibold text-xs leading-none">{key.replace('_', ' ')}</span>
                                    <span className={cn("text-[10px] leading-none opacity-70", pomodoroPreset === key ? "text-primary-foreground" : "text-muted-foreground")}>{preset.focus / 60}m foco</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl relative overflow-hidden">
                        <div className="flex gap-2 items-center text-amber-600 dark:text-amber-400 font-bold text-xs mb-2">
                            <Lightbulb className="h-3.5 w-3.5 animate-pulse" /> Dica de Produtividade
                        </div>
                        <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed italic animate-in fade-in duration-700 key={activeTip}">
                            &quot;{activeTip}&quot;
                        </p>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="mt-8 pt-6 border-t border-border/40 animate-in slide-in-from-top-4">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Settings className="w-4 h-4"/> Configurações do Ambiente</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <Label htmlFor="sound-switch" className="flex items-center gap-2 cursor-pointer text-[10px] md:text-xs font-semibold">
                            {preferences.sound ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                            Som
                            </Label>
                            <Switch id="sound-switch" checked={preferences.sound} onCheckedChange={(v) => setPreferences(p => ({...p, sound: v}))} />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <Label htmlFor="notif-switch" className="flex items-center gap-2 cursor-pointer text-[10px] md:text-xs font-semibold">
                            <Bell className={cn("h-4 w-4", preferences.notif ? "text-primary" : "text-muted-foreground")} />
                            Avisos
                            </Label>
                            <Switch id="notif-switch" checked={preferences.notif} onCheckedChange={(v) => setPreferences(p => ({...p, notif: v}))} />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <Label htmlFor="break-switch" className="flex items-center gap-2 cursor-pointer text-[10px] md:text-xs font-semibold">
                            <Coffee className={cn("h-4 w-4", preferences.autoBreak ? "text-primary" : "text-muted-foreground")} />
                            Auto-Pausa
                            </Label>
                            <Switch id="break-switch" checked={preferences.autoBreak} onCheckedChange={(v) => setPreferences(p => ({...p, autoBreak: v}))} />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <Label htmlFor="focus-switch" className="flex items-center gap-2 cursor-pointer text-[10px] md:text-xs font-semibold">
                            <Zap className={cn("h-4 w-4", preferences.autoFocus ? "text-primary" : "text-muted-foreground")} />
                            Auto-Foco
                            </Label>
                            <Switch id="focus-switch" checked={preferences.autoFocus} onCheckedChange={(v) => setPreferences(p => ({...p, autoFocus: v}))} />
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      {/* DIALOG DE SALVAR SESSÃO */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/60 shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-primary/10 to-background border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                <Award className="h-6 w-6 text-primary" /> Relatório da Sessão
              </DialogTitle>
              <DialogDescription>
                Você focou por <strong className="text-foreground">{sessionDurationMinutes} minutos</strong> em {selectedSubject?.title}. Como foi?
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nível de Foco (1-5)</Label>
                <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                  {[1, 2, 3, 4, 5].map(level => (
                    <Button
                      key={level} type="button"
                      variant={focusLevel === level.toString() ? "default" : "ghost"}
                      className="flex-1 rounded-md transition-all"
                      onClick={() => setFocusLevel(level.toString())}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Atividade</Label>
                <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}><span className="flex items-center gap-2">{option.icon} {option.label}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resumo / Anotações</Label>
              <Textarea
                placeholder="Anotações feitas durante o foco aparecerão aqui..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="min-h-[120px] resize-none bg-muted/30 focus:bg-background"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)} className="flex-1 h-12">Descartar</Button>
              <Button onClick={handleSaveSession} className="flex-1 h-12 bg-primary font-bold shadow-lg shadow-primary/20 text-md">
                <CheckCircle2 className="h-5 w-5 mr-2" /> Salvar Evolução
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}