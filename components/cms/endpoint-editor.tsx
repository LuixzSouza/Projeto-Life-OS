"use client";

import { useState, useCallback } from "react";
import { SitePage } from "@prisma/client";
import { toast } from "sonner";
import { savePageContent } from "@/app/(dashboard)/cms/actions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Check, Terminal, Loader2 } from "lucide-react";

import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

// Editor de endpoint usado dentro do SiteManager (container CMS).
export function EndpointEditor({ page }: { page: SitePage }) {
  const [code, setCode] = useState<string>(page.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onChange = useCallback((val: string) => {
    setCode(val);
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const fd = new FormData();
    fd.append("pageId", page.id);
    fd.append("content", code);

    try {
      await savePageContent(fd);
      toast.success("Build completo: Conteúdo sincronizado");
      setIsDirty(false);
    } catch {
      toast.error("Falha na sincronização");
    } finally {
      setIsSaving(false);
    }
  };

  let isJsonValid = true;
  try { JSON.parse(code); } catch { isJsonValid = false; }

  return (
    <div className="flex flex-col h-full bg-card border border-border/40 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* TOOLBAR DO EDITOR */}
      <div className="flex items-center justify-between bg-muted/10 border-b border-border/40 p-4 md:px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-mono text-[10px] font-bold bg-background shadow-inner">
            /{page.slug}
          </Badge>

          {isDirty ? (
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              Pendente
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Check className="h-3 w-3" /> Live
            </Badge>
          )}

          {!isJsonValid && code.length > 0 && (
            <span className="hidden md:inline text-[10px] font-mono text-muted-foreground/60 uppercase">
              (Raw Text Mode)
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-8 gap-2 font-black uppercase tracking-widest text-[10px] rounded-lg shadow-lg"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Deploy
          </Button>
        </div>
      </div>

      {/* ÁREA DO CODEMIRROR */}
      <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
        <ScrollArea className="h-full w-full">
          <CodeMirror
            value={code}
            height="100%"
            theme={vscodeDark}
            extensions={[jsonLang(), javascript({ jsx: true })]}
            onChange={onChange}
            className="text-[13px] md:text-[14px] leading-relaxed custom-codemirror"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              bracketMatching: true,
              autocompletion: true,
            }}
          />
        </ScrollArea>
      </div>

      {/* FOOTER METADATA */}
      <div className="bg-muted/10 border-t border-border/40 p-3 px-6 flex justify-between items-center text-[10px] font-mono font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">
        <span className="flex items-center gap-1"><Terminal className="h-3 w-3" /> Instance: {page.id.split('-')[0]}</span>
        <span>Build: {new Date(page.updatedAt).toLocaleDateString("pt-BR")}</span>
      </div>
    </div>
  );
}
