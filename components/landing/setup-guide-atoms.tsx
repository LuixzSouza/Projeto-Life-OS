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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {stepNumber}
          </span>
          Passo {stepNumber}
        </div>
      )}

      <p className="text-foreground text-sm leading-relaxed">{description}</p>

      {/* Janela de terminal — sempre escura de propósito (como um terminal real),
          o que dá um visual premium e mantém contraste alto nos dois temas. */}
      <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-lg">
        {/* Barra superior estilo macOS */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/90" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/90" />
            <span className="h-3 w-3 rounded-full bg-green-500/90" />
          </span>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {language === 'env' ? 'arquivo .env' : 'terminal'}
          </span>
          <button
            onClick={handleCopy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            title={copied ? "Copiado!" : "Copiar comando"}
            aria-label={copied ? "Copiado" : "Copiar comando"}
          >
            {copied ? (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Copiado</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copiar</>
            )}
          </button>
        </div>
        {/* Corpo do comando */}
        <code className={cn(
          "block w-full whitespace-pre-wrap break-all p-4 text-left font-mono text-sm leading-relaxed",
          language === 'env' ? 'text-emerald-300' : 'text-cyan-300'
        )}>
          {command}
        </code>
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
      isOptional ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary"
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
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors group"
        >
          {linkText || "Saiba mais"}
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      )}
    </div>
  </li>
);
