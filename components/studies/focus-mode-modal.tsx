"use client";

import { useState, useEffect } from "react";
import {
  Play, Pause, CheckCircle2, BrainCircuit, Coffee,
  ChevronRight, Clock, X, PenTool, EyeOff, Eye, AlertTriangle,
} from "lucide-react";
import { StudySubject } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/* ================================
   MODO FOCO (MODAL IMERSIVO)
================================ */
interface FocusModeModalProps {
  isOpen: boolean;
  subject: StudySubject | null;
  settings: { focus: number; shortBreak: number; longBreak: number; cycles: number };
  preferences: { sound: boolean; notif: boolean; autoBreak: boolean; autoFocus: boolean };
  onFinish: (totalFocusSeconds: number, liveNotes: string) => void;
  onAbort: () => void;
}

export function FocusModeModal({ isOpen, subject, settings, preferences, onFinish, onAbort }: FocusModeModalProps) {
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
