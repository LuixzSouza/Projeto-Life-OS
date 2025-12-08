"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square, Clock } from "lucide-react";
import { StudySubject } from "@prisma/client";
import { logSession } from "@/app/(dashboard)/studies/actions";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StudyTimerProps {
  subjects: StudySubject[];
}

export function StudyTimer({ subjects }: StudyTimerProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");

  // Lógica do Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Formatar tempo (00:00:00)
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Salvar Sessão
  const handleSave = async () => {
    if (!selectedSubject) return alert("Selecione uma matéria!");
    
    const minutes = Math.ceil(seconds / 60);
    await logSession(selectedSubject, minutes, notes);
    
    // Resetar
    setSeconds(0);
    setIsRunning(false);
    setNotes("");
    alert("Sessão salva com sucesso! +XP");
  };

  // Tipagem do evento de mudança do select
  const handleSubjectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
  };

  return (
    <Card className="border-2 border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-indigo-500">
            <Clock className="h-5 w-5" />
            <h2 className="font-semibold">Sessão de Foco</h2>
        </div>

        {/* Seleção de Matéria */}
        {!isRunning && seconds === 0 && (
          <select 
            className="w-full p-2 rounded-md border bg-background"
            value={selectedSubject}
            onChange={handleSubjectChange}
          >
            <option value="">Selecione o que vai estudar...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        )}

        {/* Mostrador do Tempo */}
        <div className="text-center py-4">
            <div className="text-6xl font-mono font-bold tracking-wider text-zinc-800 dark:text-zinc-100">
                {formatTime(seconds)}
            </div>
            {selectedSubject && isRunning && (
                <p className="text-sm text-green-500 animate-pulse mt-2">Estudando agora...</p>
            )}
        </div>

        {/* Controles */}
        <div className="flex justify-center gap-4">
            {!isRunning ? (
                <Button 
                    size="lg" 
                    className="w-32 bg-green-600 hover:bg-green-700"
                    disabled={!selectedSubject && seconds === 0}
                    onClick={() => setIsRunning(true)}
                >
                    <Play className="mr-2 h-4 w-4" /> {seconds > 0 ? "Retomar" : "Iniciar"}
                </Button>
            ) : (
                <Button 
                    size="lg" 
                    variant="destructive"
                    className="w-32"
                    onClick={() => setIsRunning(false)}
                >
                    <Pause className="mr-2 h-4 w-4" /> Pausar
                </Button>
            )}

            {/* Botão de Finalizar */}
            {!isRunning && seconds > 0 && (
                <DialogSave onSave={handleSave} notes={notes} setNotes={setNotes} />
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- SUB-COMPONENTE CORRIGIDO ---

// Interface para definir os tipos das props (substitui o 'any')
interface DialogSaveProps {
    onSave: () => void;
    notes: string;
    setNotes: (value: string) => void;
}

function DialogSave({ onSave, notes, setNotes }: DialogSaveProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="lg">
                    <Square className="mr-2 h-4 w-4 fill-current" /> Finalizar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resumo da Sessão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea 
                        placeholder="O que você aprendeu hoje?" 
                        value={notes} 
                        // Tipagem do evento do Textarea
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    />
                    <Button onClick={onSave} className="w-full">Confirmar e Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}