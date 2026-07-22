"use client";

import { useState, useCallback } from "react";
import { SitePage } from "@prisma/client";
import { toast } from "sonner";
import { savePageContent } from "@/app/(dashboard)/cms/actions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Check, Terminal, Loader2, AlertTriangle } from "lucide-react";

// CodeMirror (~500KB) carregado SOB DEMANDA: só baixa quando o editor abre.
import dynamic from "next/dynamic";
const JsonCodeEditor = dynamic(() => import("./json-code-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-xs text-zinc-500">
      Carregando editor…
    </div>
  ),
});

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
    // Trava de segurança: nunca publica JSON inválido (a API pública quebraria).
    if (!isJsonValid) {
      toast.error("JSON inválido — corrija a sintaxe antes de publicar.");
      return;
    }
    setIsSaving(true);
    const fd = new FormData();
    fd.append("pageId", page.id);
    fd.append("content", code);

    try {
      await savePageContent(fd);
      toast.success("Build completo: Conteúdo sincronizado");
      setIsDirty(false);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Falha na sincronização");
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
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500">
              <AlertTriangle className="h-3 w-3" /> JSON inválido
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !isJsonValid}
            title={!isJsonValid ? "Corrija o JSON antes de publicar" : undefined}
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
          <JsonCodeEditor value={code} onChange={onChange} />
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
