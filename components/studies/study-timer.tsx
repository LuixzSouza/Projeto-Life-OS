"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, CheckCircle2, BrainCircuit, Lightbulb, Zap, Timer, RotateCcw, Activity, Tag, Gauge } from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch"; 
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipos de Estudo (Baseado no Prisma Enum)
const SESSION_TYPE_OPTIONS = [
    { value: 'LEITURA', label: '📖 Leitura' },
    { value: 'VIDEO', label: '🎬 Vídeo/Aulas' },
    { value: 'EXERCICIO', label: '✏️ Exercícios' },
    { value: 'REVISAO', label: '🔄 Revisão' },
    { value: 'PROJETO', label: '🔨 Projeto' },
];

const STUDY_TIPS = [
    "A técnica Feynman: Tente explicar o que aprendeu em termos simples.",
    "Faça pausas ativas: Caminhe ou alongue-se para oxigenar o cérebro.",
    "Evite a curva do esquecimento: Revise este conteúdo em 24h.",
    "Interleaving: Misture tópicos diferentes para fortalecer a memória.",
    "Sono é essencial: A consolidação da memória acontece enquanto você dorme."
];

interface StudyTimerProps {
    subjects: StudySubject[];
}

export function StudyTimer({ subjects }: StudyTimerProps) {
    // --- 1. ESTADOS ---
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [pomodoroMode, setPomodoroMode] = useState(false);
    const [notes, setNotes] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // ✅ ESTADOS DE GAMIFICAÇÃO
    const [focusLevel, setFocusLevel] = useState('3');
    const [sessionType, setSessionType] = useState('LEITURA'); 
    const [sessionTags, setSessionTags] = useState('');
    
    const [activeTip, setActiveTip] = useState("");

    // --- 2. FUNÇÕES AUXILIARES ---
    
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const randomizeTip = () => {
        setActiveTip(STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]);
    };

    const handleReset = () => {
        if(confirm("Deseja descartar o tempo atual e zerar o cronômetro?")) {
            setSeconds(0);
            setIsRunning(false);
        }
    }

    // --- 3. EFEITOS ---
    useEffect(() => {
        randomizeTip();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
            
            document.title = `${formatTime(seconds)} - Focando`;
        } else {
            document.title = "LifeOS - Estudos";
        }

        return () => clearInterval(interval);
    }, [isRunning, seconds]);


    // --- 4. LÓGICA DE CÁLCULO ---
    const POMODORO_CYCLE = 25 * 60;
    const currentCycleTime = seconds % POMODORO_CYCLE;
    const completedCycles = Math.floor(seconds / POMODORO_CYCLE);
    const pomodoroProgress = (currentCycleTime / POMODORO_CYCLE) * 100;
    const timeToBreak = POMODORO_CYCLE - currentCycleTime;
    const isCycleComplete = seconds > 0 && currentCycleTime === 0;

    // --- 5. LOGICA DE SALVAR ATUALIZADA ---
    const handleSave = async () => {
        if (!selectedSubject) {
            toast.error("Selecione uma matéria para salvar!");
            return;
        }
        
        const minutes = Math.ceil(seconds / 60);
        
        const loadingToast = toast.loading("Salvando sessão...");

        try {
            // ✅ CORREÇÃO CRÍTICA: Passando todos os 6 parâmetros esperados pela Server Action
            const result = await logSession(
                selectedSubject, 
                minutes, 
                notes, 
                focusLevel,
                sessionType,
                sessionTags
            );

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(result.message);
                
                // Resetar estados
                setSeconds(0);
                setNotes("");
                setFocusLevel('3');
                setSessionType('LEITURA');
                setSessionTags('');
                setIsDialogOpen(false);
                setIsRunning(false);
                randomizeTip();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão ao tentar salvar.");
        }
    };

    return (
        <Card className="relative overflow-hidden border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-zinc-950 transition-all duration-500">
            <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2" />

            <CardContent className="p-6 space-y-6">
                
                {/* --- HEADER e POMODORO SWITCH --- */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <BrainCircuit className="h-5 w-5" />
                        <h2 className="font-bold">Laboratório de Foco</h2>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg border">
                        <Label htmlFor="pomodoro-mode" className="text-xs font-medium text-zinc-500 cursor-pointer pr-2">Modo Pomodoro</Label>
                        <Switch id="pomodoro-mode" checked={pomodoroMode} onCheckedChange={setPomodoroMode} />
                    </div>
                </div>

                {/* --- MOSTRADOR DE TEMPO e DICA --- */}
                <div className="text-center py-4 relative">
                    <div className={`text-7xl font-mono font-bold tracking-tight transition-all duration-300 ${isRunning ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-zinc-400'}`}>
                        {formatTime(seconds)}
                    </div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mt-2 font-medium">
                        {isRunning ? "Sessão em Andamento" : "Aguardando Início"}
                    </p>

                    {/* GUIAS POMODORO */}
                    {pomodoroMode && (
                        <div className={`mt-6 p-4 rounded-xl border transition-all duration-500 ${isCycleComplete ? 'bg-green-100 border-green-200 dark:bg-green-900/20' : 'bg-white/60 dark:bg-black/20 border-indigo-100 dark:border-indigo-900/50'}`}>
                            <div className="flex justify-between text-xs mb-2 font-medium">
                                <span className="flex items-center gap-1 text-indigo-600">
                                    <Timer className="h-3 w-3" /> 
                                    {isCycleComplete ? "Hora da Pausa!" : `Ciclo: ${formatTime(timeToBreak)}`}
                                </span>
                                <span className="flex items-center gap-1 text-green-600">
                                    <Zap className="h-3 w-3" />
                                    {completedCycles} Ciclos Feitos
                                </span>
                            </div>
                            <Progress 
                                value={pomodoroProgress} 
                                className="h-2" 
                                indicatorClassName={isCycleComplete ? "bg-green-500" : "bg-indigo-600"}
                            />
                            <p className="text-[10px] text-zinc-400 mt-2 text-left">
                                *Barra de 25 minutos. Ao completar, faça uma pausa curta.
                            </p>
                        </div>
                    )}

                    {/* DICA DO DIA */}
                    <div className="mt-6 flex items-start justify-center gap-2 text-sm text-zinc-500 bg-white/50 dark:bg-zinc-800/50 p-3 rounded-lg border border-dashed hover:border-indigo-300 transition-colors min-h-[50px]">
                        {activeTip ? (
                            <>
                                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                <p className="italic">&quot;{activeTip}&quot;</p>
                            </>
                        ) : (
                            <span className="animate-pulse w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></span>
                        )}
                    </div>
                </div>

                {/* --- SELEÇÃO DE MATÉRIA --- */}
                {(!isRunning && seconds === 0) ? (
                    <div className="relative">
                        <select 
                            className="w-full p-3 pl-4 rounded-xl border bg-background/50 backdrop-blur focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:bg-background/80"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <option value="">📚 Selecione o tópico de estudo...</option>
                            {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            📚 {subjects.find(s => s.id === selectedSubject)?.title || "Estudo Livre"}
                        </span>
                    </div>
                )}

                {/* --- CONTROLES PRINCIPAIS --- */}
                <div className="flex items-center justify-center gap-3 pt-2">
                    
                    {/* Botão Reset */}
                    {(!isRunning && seconds > 0) && (
                        <Button variant="ghost" size="icon" onClick={handleReset} title="Reiniciar Timer" className="h-14 w-14 rounded-xl border-2 border-dashed text-zinc-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50">
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    )}

                    {/* Play / Pause */}
                    {!isRunning ? (
                        <Button 
                            size="lg" 
                            className="flex-1 h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                            disabled={!selectedSubject && seconds === 0}
                            onClick={() => setIsRunning(true)}
                        >
                            <Play className="mr-2 h-5 w-5 fill-current" /> {seconds > 0 ? "Continuar Foco" : "Iniciar Sessão"}
                        </Button>
                    ) : (
                        <Button 
                            size="lg" 
                            variant="outline"
                            className="flex-1 h-14 text-lg rounded-xl border-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                            onClick={() => setIsRunning(false)}
                        >
                            <Pause className="mr-2 h-5 w-5 fill-current" /> Pausar
                        </Button>
                    )}

                    {/* Botão Finalizar (Save) */}
                    {(!isRunning && seconds > 0) && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="default" size="lg" className="h-14 px-6 rounded-xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20">
                                    <CheckCircle2 className="mr-2 h-5 w-5" /> Salvar
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <CheckCircle2 className="text-green-600" />
                                        Consolidar Sessão
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    
                                    {/* DURAÇÃO */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg text-center">
                                        <p className="text-sm text-zinc-500">Duração Registrada</p>
                                        <p className="text-3xl font-bold text-indigo-600">{Math.ceil(seconds / 60)} min</p>
                                    </div>
                                    
                                    {/* --- NOVOS CAMPOS DE GAMIFICAÇÃO --- */}
                                    <div className="grid grid-cols-2 gap-4">
                                        
                                        {/* 1. TIPO DE SESSÃO */}
                                        <div className="space-y-2">
                                            <Label htmlFor="sessionType" className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1">
                                                <Activity className="h-3 w-3" /> Tipo de Estudo
                                            </Label>
                                            <Select value={sessionType} onValueChange={setSessionType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SESSION_TYPE_OPTIONS.map(option => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* 2. NÍVEL DE FOCO */}
                                        <div className="space-y-2">
                                            <Label htmlFor="focusLevel" className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1">
                                                <Gauge className="h-3 w-3" /> Foco (1 a 5)
                                            </Label>
                                            <Input 
                                                id="focusLevel"
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={focusLevel}
                                                onChange={(e) => setFocusLevel(e.target.value)}
                                                className="text-center font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* 3. TAGS (Opcional) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="sessionTags" className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1">
                                            <Tag className="h-3 w-3" /> Tags (Separadas por vírgula)
                                        </Label>
                                        <Input
                                            id="sessionTags"
                                            placeholder="ex: performance, css-grid, review"
                                            value={sessionTags}
                                            onChange={(e) => setSessionTags(e.target.value)}
                                        />
                                    </div>

                                    {/* NOTAS (Mantido) */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-zinc-500">Notas da Sessão (Opcional)</Label>
                                        <Textarea 
                                            placeholder="- O que você aprendeu hoje?&#10;- Dificuldades encontradas..." 
                                            className="min-h-[120px] font-mono text-sm resize-none focus-visible:ring-indigo-500"
                                            value={notes} 
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* FOOTER */}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Voltar</Button>
                                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                                            Confirmar e Ganhar XP
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}