"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, X, Rocket } from "lucide-react";
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

export function OnboardingWidget({ steps }: { steps: Step[] }) {
  const [isVisible, setIsVisible] = useState(true);

  // Calcula progresso
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progress = (completedCount / totalCount) * 100;

  // Se tudo estiver completo ou o usuário fechar, não mostra nada
  if (!isVisible || completedCount === totalCount) return null;

  return (
    <div className="relative group">
        {/* Borda Gradiente Animada */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-75 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
        
        <Card className="relative border-0 bg-white dark:bg-zinc-950 shadow-xl">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Rocket className="h-5 w-5 text-indigo-500" /> 
                        Primeiros Passos
                    </CardTitle>
                    <p className="text-sm text-zinc-500">Configure seu Life OS para extrair o máximo do sistema.</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-600" onClick={() => setIsVisible(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            
            <CardContent>
                <div className="flex items-center gap-4 mb-6">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs font-bold text-zinc-500">{Math.round(progress)}%</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step) => (
                        <div 
                            key={step.id} 
                            className={cn(
                                "flex flex-col p-3 rounded-lg border transition-all",
                                step.completed 
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30" 
                                    : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                {step.completed ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" /> Feito
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                                        <Circle className="h-4 w-4" /> Pendente
                                    </span>
                                )}
                            </div>
                            
                            <h4 className={cn("font-semibold text-sm mb-1", step.completed && "line-through text-zinc-400")}>
                                {step.label}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mb-3 leading-tight min-h-[2.5em]">
                                {step.description}
                            </p>

                            {!step.completed && (
                                <Link href={step.href} className="mt-auto">
                                    <Button size="sm" variant="outline" className="w-full text-xs h-7 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:text-indigo-600 hover:border-indigo-200">
                                        {step.cta} <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}