"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Copy, ArrowUpRight } from "lucide-react";

// Componente para o botão de comando com cópia
export const CommandButton = ({
  command,
  language,
  description,
  stepNumber
}: {
  command: string;
  language: string;
  description: string;
  stepNumber?: number;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success("Comando copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o comando.");
    }
  };

  return (
    <div className="space-y-3 pt-3 pb-5">
      {stepNumber && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700 text-[10px]">
            {stepNumber}
          </span>
          Passo {stepNumber}
        </div>
      )}

      <p className="text-foreground text-sm leading-relaxed">{description}</p>

      <div className="relative group">
        <code className={cn(
          "block w-full text-left p-4 rounded-xl bg-muted/80 text-sm font-mono whitespace-pre-wrap break-all border border-border hover:border-border transition-colors",
          language === 'env' ? 'text-emerald-300/90' : 'text-cyan-300/90',
          "leading-relaxed"
        )}>
          {command}
        </code>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 p-2 rounded-lg bg-muted/90 backdrop-blur-sm text-foreground/80 hover:bg-zinc-700 hover:text-foreground transition-all duration-200 shadow-lg hover:shadow-zinc-800/50"
          title={copied ? "Copiado!" : "Copiar comando"}
          aria-label={copied ? "Copiado" : "Copiar comando"}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Indicador de linguagem */}
        <div className={cn(
          "absolute left-3 -top-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
          language === 'env'
            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50"
            : "bg-cyan-900/30 text-cyan-400 border border-cyan-800/50"
        )}>
          {language === 'env' ? 'Variável de Ambiente' : 'Terminal'}
        </div>
      </div>
    </div>
  );
};

// Componente para o item de requisito
export const RequirementItem = ({
  icon: Icon,
  title,
  description,
  link,
  linkText,
  isOptional = false
}: {
  icon: React.ElementType;
  title: string;
  description: React.ReactNode;
  link?: string;
  linkText?: string;
  isOptional?: boolean;
}) => (
  <li className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
    <div className={cn(
      "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg",
      isOptional ? "bg-muted/50 text-muted-foreground" : "bg-indigo-900/30 text-indigo-400"
    )}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-foreground">{title}</h4>
        {isOptional && (
          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
            Opcional
          </span>
        )}
      </div>
      <div className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors group"
        >
          {linkText || "Saiba mais"}
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      )}
    </div>
  </li>
);
