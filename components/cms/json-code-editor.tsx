"use client";

// Editor CodeMirror (JSON/JS) compartilhado pelos editores do CMS. Concentra
// aqui todo o peso do CodeMirror (~500KB: core + linguagens + tema) para que
// ele seja code-split UMA vez e carregado SOB DEMANDA via next/dynamic — em vez
// de duplicado e embutido no bundle inicial de cada editor.
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

export interface JsonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function JsonCodeEditor({ value, onChange, className }: JsonCodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={vscodeDark}
      extensions={[jsonLang(), javascript({ jsx: true })]}
      onChange={onChange}
      className={className ?? "text-[13px] md:text-[14px] leading-relaxed custom-codemirror"}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        autocompletion: true,
      }}
    />
  );
}
