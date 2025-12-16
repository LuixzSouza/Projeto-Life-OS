"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Moon, Plus, ArrowRight, BedDouble, AlarmClock, BrainCircuit, Battery, Loader2, Sparkles } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SleepCardProps {
  value: number | string;
}

export function SleepCard({ value }: SleepCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hours = Number(value) || 0;

  // --- LÓGICA DE ANÁLISE DO SONO (Com cores do Tema) ---
  const getSleepAnalysis = (h: number) => {
    if (h === 0) return {
      status: "Sem dados",
      // Cores baseadas em variáveis CSS (Muted)
      textClass: "text-muted-foreground",
      bgClass: "bg-muted",
      barClass: "bg-muted",
      gradientClass: "from-muted/10",
      icon: BedDouble,
      tip: "Registre seu sono para receber análises de recuperação."
    };
    if (h < 5) return { 
      status: "Crítico", 
      // Cores baseadas em variáveis CSS (Destructive)
      textClass: "text-destructive",
      bgClass: "bg-destructive/10",
      barClass: "bg-destructive",
      gradientClass: "from-destructive/10",
      icon: Battery,
      tip: "Privação severa. Tente cochilos de 20min para restaurar o foco."
    };
    if (h < 7) return { 
      status: "Insuficiente", 
      // Cores baseadas em variáveis CSS (Warning/Secondary - simulado com classes utilitárias se não houver var)
      textClass: "text-orange-500 dark:text-orange-400",
      bgClass: "bg-orange-500/10",
      barClass: "bg-orange-500",
      gradientClass: "from-orange-500/10",
      icon: AlarmClock,
      tip: "Quase lá. Tente dormir 30min mais cedo para otimizar o ciclo REM."
    };
    if (h <= 9) return { 
      status: "Ideal", 
      // Cores baseadas em variáveis CSS (Primary)
      textClass: "text-primary",
      bgClass: "bg-primary/10",
      barClass: "bg-primary",
      gradientClass: "from-primary/10",
      icon: Moon,
      tip: "Excelente! Recuperação neural e muscular otimizada."
    };
    return { 
      status: "Longo", 
      textClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
      barClass: "bg-blue-500",
      gradientClass: "from-blue-500/10",
      icon: BrainCircuit,
      tip: "Dormir demais pode causar inércia do sono. Mantenha consistência."
    };
  };

  const analysis = getSleepAnalysis(hours);
  const percentage = Math.min((hours / 8) * 100, 100);

  const handleSave = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const val = parseFloat(formData.get("value") as string);
      if(isNaN(val) || val < 0 || val > 24) {
        toast.error("Insira um valor válido entre 0 e 24h.");
        return;
      }

      await logMetric(formData);
      toast.success("Sono registrado com sucesso!");
      setIsOpen(false);
    } catch {
      toast.error("Erro ao salvar registro.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 group h-full">
      
      {/* Background Decorativo (Gradiente Dinâmico) */}
      <div className={cn("absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-br to-transparent opacity-50 blur-3xl -translate-y-1/4 translate-x-1/4 transition-colors duration-500 pointer-events-none", analysis.gradientClass)} />

      <CardContent className="p-6 flex flex-col h-full justify-between relative z-10">
        
        {/* --- Header & Valor --- */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4 items-center">
            <div className={cn("p-3 rounded-xl ring-1 ring-inset transition-colors duration-300", analysis.bgClass, analysis.textClass.replace('text-', 'ring-').replace('500', '500/20'))}>
              <analysis.icon className={cn("h-6 w-6", analysis.textClass)} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Tempo de Descanso</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tighter text-foreground">
                  {hours}
                  <span className="text-lg text-muted-foreground/60 ml-0.5">h</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Botão de Ação */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors border border-border/50">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" /> Registrar Sono
                </DialogTitle>
                <DialogDescription>Quantas horas você dormiu na última noite?</DialogDescription>
              </DialogHeader>
              <form action={handleSave} className="space-y-4 mt-2">
                <input type="hidden" name="type" value="SLEEP" />
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Duração (Horas)</Label>
                  <div className="relative">
                    <Input 
                      name="value" 
                      type="number" 
                      step="0.1" 
                      placeholder="Ex: 7.5" 
                      className="text-xl font-bold h-14 pr-10 bg-muted/30 border-border/50 focus:border-primary/50" 
                      autoFocus 
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">h</span>
                  </div>
                </div>
                <Button className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Registro"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* --- Barra de Progresso & Status --- */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className={cn("text-xs font-bold uppercase tracking-wider", analysis.textClass)}>
              {analysis.status}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Meta: 8h</span>
          </div>
          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
            <div 
              className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", analysis.barClass)} 
              style={{ width: `${percentage}%` }} 
            />
          </div>
        </div>

        {/* --- Feedback (Insight) --- */}
        <div className="mt-5 p-3.5 bg-background/60 backdrop-blur-sm rounded-xl border border-border/50 flex gap-3 items-start">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {analysis.tip}
          </p>
        </div>

        {/* --- Footer Link --- */}
        <Link 
          href="/health/sleep" 
          className="mt-4 pt-3 border-t border-dashed border-border/60 flex justify-between items-center group/link cursor-pointer"
        >
          <span className="text-xs font-medium text-muted-foreground group-hover/link:text-primary transition-colors">
            Ver análise detalhada
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary group-hover/link:translate-x-1 transition-all" />
        </Link>

      </CardContent>
    </Card>
  );
}