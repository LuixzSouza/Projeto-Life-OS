"use client";

import { useState, useCallback } from "react";
import { ManagedSite, SitePage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    Plus, Trash2, Save, Copy, Check, FileJson, 
    Settings, Code2, Database, AlertCircle, TerminalSquare, 
    ShieldAlert, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { savePageContent, createPage, deletePage, deleteSite } from "@/app/(dashboard)/cms/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// 🟢 IMPORTS DO CODEMIRROR
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}

/* ======================================================
   SUB-COMPONENTE: CODE EDITOR
====================================================== */
function CodeEditor({ page }: { page: SitePage }) {
    const [code, setCode] = useState(page.content);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const onChange = useCallback((val: string) => {
        setCode(val);
        setIsDirty(true);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("pageId", page.id);
        formData.append("content", code);
        try {
            await savePageContent(formData);
            setIsDirty(false);
            toast.success("Deploy realizado!");
        } catch {
            toast.error("Erro na sincronização.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await deletePage(page.id);
            toast.success("Endpoint removido.");
        } catch {
            toast.error("Erro ao excluir.");
        }
    };

    let isJsonValid = true;
    try { JSON.parse(code); } catch { isJsonValid = false; }

    return (
        <div className="h-full flex flex-col bg-card border border-border/40 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* BARRA DE FERRAMENTAS DO EDITOR */}
            <div className="flex items-center justify-between bg-muted/10 border-b border-border/40 p-4 md:px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <TerminalSquare className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 bg-background shadow-inner">
                            /{page.slug}
                        </Badge>
                    </div>
                    
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
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        {/* 🟢 z-[100] adicionado para furar o blur */}
                        <AlertDialogContent className="fixed left-1/2 top-1/2 z-[100] w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-border/40 bg-background p-8 shadow-2xl">
                            <AlertDialogHeader className="flex flex-col items-center text-center">
                                <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                                    <ShieldAlert className="h-6 w-6" />
                                </div>
                                <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">Remover Endpoint?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                    A rota <code className="text-foreground font-bold">/{page.slug}</code> será excluída permanentemente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
                                <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 px-6">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmDelete} className="rounded-xl bg-destructive text-white hover:bg-destructive/90 font-bold uppercase text-[10px] tracking-widest h-11 px-6">
                                    Deletar Agora
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className="gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
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

            {/* RODAPÉ DO EDITOR */}
            <div className="bg-muted/10 border-t border-border/40 p-3 px-6 flex justify-between items-center text-[10px] font-mono font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">
                <span>Instance: {page.id.split('-')[0]}</span>
                <span>Sincronizado: {new Date(page.updatedAt).toLocaleTimeString("pt-BR")}</span>
            </div>
        </div>
    );
}

/* ======================================================
   SUB-COMPONENTE: API GUIDE
====================================================== */
function ApiGuide({ site }: { site: ManagedSite }) {
    const [copied, setCopied] = useState(false);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    const copyToClip = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado!");
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <Card className="border-border/40 shadow-xl rounded-[2rem] bg-card overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/40 p-8">
                    <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tighter">
                        <Code2 className="h-5 w-5 text-primary" /> Integração de Rede
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">X-API-KEY (Privada)</Label>
                        <div className="flex gap-2 p-1 bg-muted/20 border border-border/50 rounded-2xl shadow-inner">
                            <Input value={site.apiKey} readOnly className="font-mono text-sm bg-transparent border-none focus-visible:ring-0" />
                            <Button variant="secondary" className="rounded-xl shadow-sm" onClick={() => copyToClip(site.apiKey)}>
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Fetch Snippet</Label>
                        <div className="bg-[#1e1e1e] border border-border/20 p-5 rounded-2xl relative group shadow-inner">
                            <pre className="font-mono text-[13px] text-[#9cdcfe] overflow-x-auto">
{`const res = await fetch('${baseUrl}/api/cms/${site.apiKey}/home');
const data = await res.json();`}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

/* ======================================================
   COMPONENTE PRINCIPAL: SITE EDITOR
====================================================== */
export function SiteEditor({ site }: { site: SiteWithPages }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(site.pages.length > 0 ? site.pages[0].id : "new-page");
    
    // Estados da Danger Zone
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleFinalDeleteSite = async () => {
        setIsDeleting(true);
        try {
            await deleteSite(site.id);
            toast.success("Container destruído com sucesso.");
            router.push("/cms");
        } catch {
            toast.error("Erro ao destruir container.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* SIDEBAR DO EDITOR */}
            <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border/40 bg-muted/5 flex flex-col shrink-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col h-full">
                    <div className="p-5 border-b border-border/40 bg-background/50">
                        <Button onClick={() => setActiveTab("new-page")} className="w-full gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md h-10">
                            <Plus className="h-4 w-4" /> Novo Endpoint
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">
                            
                            {/* ROTAS */}
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <Database className="h-3 w-3" /> Rotas Ativas
                                </div>
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                    {site.pages.map(page => (
                                        <TabsTrigger 
                                            key={page.id} value={page.id}
                                            className="w-full justify-start px-3 py-2.5 h-auto text-xs font-semibold rounded-xl text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 transition-all"
                                        >
                                            <FileJson className="mr-2 h-4 w-4 opacity-70" />
                                            <span className="truncate">/{page.slug}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <Separator className="bg-border/40" />

                            {/* SISTEMA */}
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <Settings className="h-3 w-3" /> Sistema
                                </div>
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                    <TabsTrigger value="api" className="w-full justify-start px-3 py-2.5 rounded-xl text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                                        <Code2 className="mr-2 h-4 w-4 opacity-70" /> Integração
                                    </TabsTrigger>
                                    <TabsTrigger value="settings" className="w-full justify-start px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-600 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all">
                                        <AlertCircle className="mr-2 h-4 w-4 opacity-70" /> Danger Zone
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                        </div>
                    </ScrollArea>
                </Tabs>
            </aside>

            {/* PAINEL PRINCIPAL DO EDITOR */}
            <main className="flex-1 bg-background/50 p-4 md:p-6 overflow-hidden flex flex-col relative min-h-[500px]">
                <Tabs value={activeTab} className="h-full flex flex-col relative w-full">
                    
                    {/* Renderiza o CodeEditor para cada página */}
                    {site.pages.map(page => (
                        <TabsContent key={page.id} value={page.id} className="h-full mt-0 focus-visible:ring-0">
                            <CodeEditor page={page} />
                        </TabsContent>
                    ))}

                    {/* ABA: CRIAR NOVA ROTA */}
                     <TabsContent value="new-page" className="h-full mt-0 overflow-y-auto">
                        <div className="max-w-xl mx-auto py-10">
                            <Card className="border-border/40 shadow-xl rounded-[2rem] bg-card overflow-hidden">
                                <CardHeader className="bg-primary/5 border-b border-border/40 p-8 text-center">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 border border-primary/20">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Inicializar Rota</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <form action={async (fd) => {
                                        await createPage(fd);
                                        toast.success("Build completo!");
                                        // Idealmente poderíamos trocar para a tab da página recém criada aqui se tivéssemos o retorno do ID
                                    }} className="space-y-6">
                                        <input type="hidden" name="siteId" value={site.id} />
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Caminho do Endpoint</Label>
                                            <div className="flex items-center bg-muted/20 border border-border/50 rounded-xl shadow-inner p-1 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-12">
                                                <span className="pl-4 pr-2 font-mono text-muted-foreground font-bold text-lg">/</span>
                                                <Input name="slug" placeholder="ex: v1-posts" className="border-none bg-transparent shadow-none font-mono font-bold text-lg focus-visible:ring-0" required />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20">
                                            Provisionar Endpoint
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ABA: API */}
                    <TabsContent value="api" className="h-full mt-0 overflow-y-auto focus-visible:ring-0">
                        <div className="py-10 flex justify-center">
                            <ApiGuide site={site} />
                        </div>
                    </TabsContent>

                    {/* 🟢 ABA: SETTINGS / DANGER ZONE */}
                    <TabsContent value="settings" className="h-full mt-0 overflow-y-auto focus-visible:ring-0">
                        <div className="max-w-2xl py-10 mx-auto">
                            <Card className="border-red-500/30 bg-red-500/5 shadow-2xl rounded-[2rem]">
                                <CardHeader className="p-8 pb-4">
                                    <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mb-4">
                                        <AlertCircle className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-red-600 text-xl font-black uppercase tracking-tighter">Destruir Container</CardTitle>
                                    <CardDescription className="text-red-600/70 font-medium text-xs mt-2 leading-relaxed">
                                        Isso apagará todos os dados atrelados a este projeto e desativará a API Key <code className="font-bold">{site.apiKey.slice(0,8)}...</code> imediatamente.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Dialog onOpenChange={(open) => { if (!open) setDeleteConfirmName(""); }}>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02]">
                                                <Trash2 className="mr-2 h-4 w-4" /> Iniciar Destruição
                                            </Button>
                                        </DialogTrigger>
                                        
                                        {/* 🟢 z-[100] adicionado para furar o blur */}
                                        <DialogContent className="fixed left-1/2 top-1/2 z-[100] w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-border/40 bg-card p-8 shadow-2xl">
                                            <DialogHeader className="flex flex-col items-center text-center">
                                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                                                    <ShieldAlert className="h-7 w-7" />
                                                </div>
                                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">Ação Crítica</DialogTitle>
                                                <DialogDescription className="text-sm font-medium py-2">
                                                    Para confirmar a exclusão de <span className="font-black text-foreground underline">{site.name}</span>, digite o nome do projeto:
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-6 mt-2">
                                                <Input 
                                                    value={deleteConfirmName} 
                                                    onChange={(e) => setDeleteConfirmName(e.target.value)} 
                                                    placeholder={site.name}
                                                    className="h-14 rounded-2xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-red-500/20"
                                                />
                                                <Button 
                                                    disabled={deleteConfirmName !== site.name || isDeleting} 
                                                    onClick={handleFinalDeleteSite}
                                                    className="w-full h-14 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 transition-all"
                                                >
                                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "DELETAR PROJETO PERMANENTEMENTE"}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}