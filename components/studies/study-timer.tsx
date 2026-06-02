"use client";

import { useState, useEffect } from "react";
import {
  Play, CheckCircle2, Lightbulb, FolderTree, Settings, Coffee,
  Volume2, VolumeX, Bell, Award, ChevronRight, Zap,
} from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";

import {
  SESSION_TYPE_OPTIONS, POMODORO_PRESETS, STUDY_TIPS,
  type SessionType, type PomodoroPreset,
} from "./study-timer-constants";
import { FocusModeModal } from "./focus-mode-modal";

/* ================================
   PAINEL PRINCIPAL
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
