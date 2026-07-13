"use client";

// Núcleo pesado do realce de sintaxe (Prism + tema oneDark ~670KB), isolado
// num módulo próprio para ser carregado SOB DEMANDA via next/dynamic. Assim o
// bundle das notas só puxa esse peso quando um bloco de código realmente aparece.
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeHighlighter({ language, value }: { language?: string; value: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      customStyle={{ margin: 0, borderRadius: 0, fontSize: "12.5px", background: "#1e1e2e" }}
      wrapLongLines
    >
      {value}
    </SyntaxHighlighter>
  );
}
