'use client';

import { useState, useCallback, useRef } from 'react';
import { updateProjectNotes } from '@/app/(dashboard)/projects/actions';
import { toast } from 'sonner';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectNotesProps {
  projectId: string;
  initialNotes: string;
}

export function ProjectNotes({ projectId, initialNotes }: ProjectNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Timeout para auto-save (opcional)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async (contentToSave: string) => {
    setIsSaving(true);
    const result = await updateProjectNotes(projectId, contentToSave);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setLastSaved(new Date());
    }
    setIsSaving(false);
  }, [projectId]);

  // Função para lidar com a digitação com Debounce (salva automaticamente após 2s sem digitar)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleSave(value);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full relative group">
      {/* HEADER DE AÇÕES */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {lastSaved && !isSaving && (
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500/80 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
            <CheckCircle2 className="h-3 w-3" />
            Salvo
          </div>
        )}
        
        <Button 
          onClick={() => handleSave(notes)} 
          disabled={isSaving || notes === initialNotes}
          size="sm"
          className="h-10 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[10px] shadow-xl transition-all"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {isSaving ? "Sincronizando" : "Forçar Sincronia"}
        </Button>
      </div>

      {/* ÁREA DE TEXTO */}
      <div className="flex-1 bg-muted/5 border border-dashed border-border/40 rounded-[3rem] p-10 md:p-16 focus-within:border-primary/30 focus-within:bg-background transition-all shadow-inner relative overflow-hidden">
        <textarea 
          value={notes}
          onChange={handleChange}
          className={cn(
            "w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none",
            "text-2xl md:text-3xl leading-[1.6] text-foreground/90 placeholder:text-muted-foreground/20 font-medium selection:bg-primary/20 custom-scrollbar"
          )}
          placeholder="Comece a registrar as memórias e estratégias da missão..."
        />
      </div>
    </div>
  );
}