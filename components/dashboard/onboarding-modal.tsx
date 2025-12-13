"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  cta: string;
}

export function OnboardingModal({ steps }: { steps: Step[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Calcula progresso
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progress = (completedCount / totalCount) * 100;
  const isAllDone = completedCount === totalCount;

  // Abre o modal automaticamente ao carregar a página
  // MAS apenas se não estiver tudo pronto (100%)
  useEffect(() => {
    if (!isAllDone) {
        // Pequeno delay para animação ficar suave ao entrar
        const timer = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(timer);
    }
  }, [isAllDone]);

  if (isAllDone) return null; // Se tudo estiver feito, o modal nem existe no DOM

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        
        <div className="flex flex-col md:flex-row">
            
            {/* LADO ESQUERDO: Visual / Progresso */}
            <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                        <Rocket className="h-6 w-6" />
                        <h2 className="font-bold text-lg">Setup Inicial</h2>
                    </div>
                    <p className="text-sm text-zinc-500 mb-6">
                        Complete estas etapas para deixar seu Life OS 100% operacional.
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-zinc-500">
                        <span>Progresso</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-zinc-400 mt-2 text-center">
                        {completedCount} de {totalCount} concluídos
                    </p>
                </div>
            </div>

            {/* LADO DIREITO: Lista de Passos */}
            <div className="flex-1 p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle>O que falta fazer?</DialogTitle>
                    <DialogDescription>
                        Clique em uma ação para configurar agora.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                    {steps.map((step) => (
                        <div 
                            key={step.id} 
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                step.completed 
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 opacity-60" 
                                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {step.completed ? (
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <Circle className="h-5 w-5" />
                                    </div>
                                )}
                                <div>
                                    <h4 className={cn("font-medium text-sm", step.completed && "line-through text-zinc-500")}>
                                        {step.label}
                                    </h4>
                                    <p className="text-xs text-zinc-500 hidden sm:block">
                                        {step.description}
                                    </p>
                                </div>
                            </div>

                            {!step.completed && (
                                <Link href={step.href}>
                                    <Button size="sm" variant="outline" className="text-xs h-8">
                                        {step.cta} <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-xs">
                        Lembrar depois
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}