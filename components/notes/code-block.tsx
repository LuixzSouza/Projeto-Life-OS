"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Check, Copy } from "lucide-react";

// Realce carregado sob demanda: enquanto o chunk pesado do Prism não chega,
// mostramos o código cru num <pre> (sem layout shift). ssr:false — highlight
// é puramente visual e client-only.
const CodeHighlighter = dynamic(() => import("./code-highlighter"), {
  ssr: false,
  loading: () => (
    <pre className="m-0 overflow-x-auto bg-[#1e1e2e] px-4 py-3 text-[12.5px] text-zinc-200">
      <code>Carregando…</code>
    </pre>
  ),
});

/** Bloco de código com realce de sintaxe (Prism) + cabeçalho com linguagem e copiar. */
export function CodeBlock({ language, value }: { language?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard pode falhar sem https/permite — ignora silenciosamente */
    }
  };

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border border-border/40">
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {language || "código"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 transition-colors hover:text-white"
        >
          {copied ? <><Check className="h-3 w-3" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
        </button>
      </div>
      <CodeHighlighter language={language} value={value} />
    </div>
  );
}
