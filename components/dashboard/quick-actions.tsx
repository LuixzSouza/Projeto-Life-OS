"use client";

import { Button } from "@/components/ui/button";
import { Wallet, CheckSquare, Zap } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Configuração centralizada dos botões
const actions = [
  {
    label: "Nova Tarefa",
    icon: CheckSquare,
    href: "/projects",
    // Estilos específicos para Azul (Tarefas)
    className: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:bg-blue-500/20"
  },
  {
    label: "Nova Transação",
    icon: Wallet,
    href: "/finance",
    // Estilos específicos para Verde (Finanças)
    className: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20"
  },
  {
    label: "Iniciar Foco",
    icon: Zap,
    href: "/studies",
    // Estilos específicos para Âmbar (Estudos)
    className: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20"
  }
];

export function QuickActions() {
    return (
        <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={300}>
                {actions.map((action, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <Link href={action.href}>
                                <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className={cn(
                                        "h-9 w-9 rounded-full transition-all duration-200 hover:scale-105 shadow-sm",
                                        action.className
                                    )}
                                >
                                    <action.icon className="h-4 w-4" />
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs font-medium">
                            <p>{action.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    )
}