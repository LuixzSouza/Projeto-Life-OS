"use client";

import { useState, useCallback } from "react";
import { ManagedSite, SitePage } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  savePageContent,
  createPage,
  deletePage,
  deleteSite,
} from "@/app/(dashboard)/cms/actions";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Plus,
  Trash2,
  Save,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Terminal,
  Database,
  AlertCircle,
  ShieldCheck,
  Globe,
  Loader2
} from "lucide-react";

// 🟢 NOVOS IMPORTS DO CODEMIRROR
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

/* ======================================================
   TYPES
====================================================== */
interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}

/* ======================================================
   COPY BUTTON (Premium Style)
====================================================== */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label || "Conteúdo"} copiado`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "h-8 gap-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all border-border/60",
        copied ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "hover:bg-muted"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label || "Copiar"}
    </Button>
  );
}

/* ======================================================
   CODE EDITOR (Terminal UI - Atualizado)
====================================================== */
function CodeEditor({ page }: { page: SitePage }) {
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

      {/* 🟢 ÁREA DO CODEMIRROR */}
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

/* ======================================================
   SITE MANAGER (Modal Sheet)
====================================================== */
export function SiteManager({ site }: { site: SiteWithPages }) {
  const [activeTab, setActiveTab] = useState<string>(
    site.pages[0]?.id ?? "new"
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSite = async () => {
    if (!confirm(`ZONA CRÍTICA:\nDeseja remover o projeto "${site.name}" permanentemente?`)) return;
    setIsDeleting(true);
    try {
        await deleteSite(site.id);
        toast.success("Container removido");
    } catch {
        toast.error("Erro ao deletar container.");
        setIsDeleting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] h-11 shadow-sm hover:bg-primary hover:text-primary-foreground transition-all group">
          <Code2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
          Gerenciar Container
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[95%] sm:w-[800px] flex flex-col h-full bg-background border-l border-border/40 p-0 overflow-hidden">
        {/* HEADER TÁTICO */}
        <div className="p-8 border-b border-border/40 bg-muted/10 shrink-0">
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <Database className="h-6 w-6 text-primary" />
                    {site.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  <Globe className="h-3 w-3" />
                  {site.url || "Localhost / Internal App"}
                  {site.url && <ExternalLink className="h-3 w-3 opacity-40" />}
                </SheetDescription>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteSite}
                disabled={isDeleting}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </Button>
            </div>

            {/* API KEY SECTION */}
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-primary/20 bg-primary/[0.03] p-3 shadow-inner">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-0.5">Project API Key</p>
                <code className="text-[10px] font-mono font-bold block truncate text-foreground/80 tracking-tighter">
                  {site.apiKey}
                </code>
              </div>
              <CopyButton text={site.apiKey} label="API Key" />
            </div>
          </SheetHeader>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 relative">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 h-full relative"
          >
            <div className="px-8 pt-4 border-b border-border/20 bg-muted/5 shrink-0">
                <ScrollArea className="w-full">
                <TabsList className="bg-transparent h-12 gap-2 p-0 justify-start">
                    {site.pages.map((page) => (
                    <TabsTrigger
                        key={page.id}
                        value={page.id}
                        className="px-4 h-9 rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-[11px] uppercase tracking-widest transition-all"
                    >
                        /{page.slug}
                    </TabsTrigger>
                    ))}

                    <TabsTrigger
                    value="new"
                    className="px-4 h-9 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:bg-muted data-[state=active]:bg-foreground data-[state=active]:text-background font-black text-[10px] uppercase tracking-widest gap-2 ml-2"
                    >
                    <Plus className="h-3.5 w-3.5" /> Novo Endpoint
                    </TabsTrigger>
                </TabsList>
                </ScrollArea>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-hidden relative">
                {/* LISTA DE PÁGINAS COM O NOVO CODE EDITOR */}
                {site.pages.map((page) => (
                <TabsContent
                    key={page.id}
                    value={page.id}
                    className="h-full m-0 focus-visible:ring-0"
                >
                    <CodeEditor page={page} />

                    <div className="mt-4 flex justify-between items-center">
                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">
                            Endpoint ativo para distribuição pública
                        </p>
                        <form
                            action={async () => {
                                if (confirm(`Remover permanentemente a rota /${page.slug}?`)) {
                                    await deletePage(page.id);
                                    toast.success("Rota removida da rede");
                                    // Se a aba excluída era a ativa, joga o usuário para "new" para evitar tela quebrada
                                    if(activeTab === page.id) setActiveTab("new");
                                }
                            }}
                        >
                            <Button
                            variant="link"
                            size="sm"
                            className="text-destructive font-bold uppercase text-[10px] tracking-widest hover:no-underline"
                            >
                            Deletar Rota /{page.slug}
                            </Button>
                        </form>
                    </div>
                </TabsContent>
                ))}

                {/* FORMULÁRIO DE NOVA PÁGINA */}
                <TabsContent value="new" className="h-full m-0 focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-300 overflow-y-auto">
                    <Card className="border-border/40 bg-muted/5 shadow-xl rounded-[2rem] border-dashed">
                        <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Inicializar Nova Rota</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                            Defina o caminho do seu novo endpoint JSON.
                        </CardDescription>
                        </CardHeader>

                        <CardContent className="p-8 pt-0">
                        <form
                            action={async (fd) => {
                            await createPage(fd);
                            toast.success("Build: Nova rota provisionada");
                            }}
                            className="space-y-6"
                        >
                            <input type="hidden" name="siteId" value={site.id} />

                            <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Slug do Endpoint</Label>
                            <div className="flex h-12 bg-muted/20 border border-border/50 rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all p-1">
                                <span className="flex items-center justify-center px-4 font-mono font-bold text-muted-foreground bg-muted/40 rounded-lg border border-border/40 mr-1">
                                /
                                </span>
                                <Input
                                name="slug"
                                required
                                placeholder="ex: servicos-v1"
                                className="border-none bg-transparent shadow-none font-mono font-bold text-sm h-full focus-visible:ring-0"
                                />
                            </div>
                            </div>

                            <Button type="submit" className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl">
                                Provisionar Rota
                            </Button>
                        </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}