"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Copy, Check, Code, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { savePageContent, createPage, deletePage, deleteSite } from "@/app/(dashboard)/cms/actions";
import { ManagedSite, SitePage } from "@prisma/client"; // Importação dos Tipos

// Interface composta para o Site com Páginas
interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}

// --- COMPONENTE: BOTÃO DE COPIAR ---
export function CopyButton({ text, label }: { text: string, label?: string }) {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-2">
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {label && <span>{label}</span>}
        </Button>
    );
}

// --- COMPONENTE: EDITOR DE JSON ---
function JsonEditor({ page }: { page: SitePage }) {
    const [json, setJson] = useState(page.content);
    const [isValid, setIsValid] = useState(true);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setJson(val);
        try {
            JSON.parse(val);
            setIsValid(true);
        } catch {
            setIsValid(false);
        }
    };

    const handleSave = async () => {
        if (!isValid) return toast.error("JSON Inválido. Corrija antes de salvar.");
        
        const formData = new FormData();
        formData.append("pageId", page.id);
        formData.append("content", json);
        
        try {
            await savePageContent(formData);
            toast.success("Conteúdo atualizado!");
        } catch {
            toast.error("Erro ao salvar.");
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{page.slug}</Badge>
                    {!isValid && <Badge variant="destructive">JSON Inválido</Badge>}
                </div>
                <Button size="sm" onClick={handleSave} disabled={!isValid}>
                    <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
            </div>
            <Textarea 
                value={json}
                onChange={handleChange}
                className={`font-mono text-sm flex-1 bg-zinc-950 text-green-400 border-zinc-800 resize-none p-4 ${!isValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                spellCheck={false}
            />
            <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>ID: {page.id}</span>
                <span>Última edição: {new Date(page.updatedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
}

// --- COMPONENTE: GERENCIADOR DE PÁGINAS (SHEET) ---
export function SiteManager({ site }: { site: SiteWithPages }) {
    const [activeTab, setActiveTab] = useState(site.pages[0]?.id || "new");

    const handleDeleteSite = async () => {
        if(confirm("Tem certeza? Isso apagará o site e todas as páginas.")) {
            await deleteSite(site.id);
            toast.success("Site removido.");
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="secondary" className="w-full">
                    <Code className="mr-2 h-4 w-4" /> Gerenciar Conteúdo
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[90%] sm:w-[600px] sm:max-w-[800px] flex flex-col h-full">
                <SheetHeader className="pb-4 border-b mb-4">
                    <SheetTitle className="flex items-center justify-between">
                        <span className="truncate">{site.name}</span>
                        <Button variant="ghost" size="icon" onClick={handleDeleteSite} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{site.url}</span>
                        <ExternalLink className="h-3 w-3 cursor-pointer" />
                    </SheetDescription>
                    
                    {/* API Key Display */}
                    <div className="flex items-center gap-2 mt-2 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md">
                        <code className="text-xs flex-1 truncate font-mono text-zinc-500">API Key: {site.apiKey}</code>
                        <CopyButton text={site.apiKey} />
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-zinc-500">Páginas do Site</h3>
                    </div>
                    
                    <ScrollArea className="w-full whitespace-nowrap border-b pb-2 mb-4">
                        <TabsList className="w-full justify-start bg-transparent p-0 gap-2">
                            {site.pages.map((p) => (
                                <TabsTrigger 
                                    key={p.id} 
                                    value={p.id}
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-4"
                                >
                                    /{p.slug}
                                </TabsTrigger>
                            ))}
                            <TabsTrigger value="new" className="gap-1 border border-dashed text-zinc-500 hover:text-foreground">
                                <Plus className="h-3 w-3" /> Nova Página
                            </TabsTrigger>
                        </TabsList>
                    </ScrollArea>

                    {/* Conteúdo das Abas */}
                    <div className="flex-1 overflow-hidden">
                        {site.pages.map((p) => (
                            <TabsContent key={p.id} value={p.id} className="h-full m-0 data-[state=active]:flex flex-col">
                                <JsonEditor page={p} />
                                <div className="mt-2 text-right">
                                    <form action={async () => {
                                        if(confirm("Deletar página?")) await deletePage(p.id);
                                    }}>
                                        <Button variant="link" size="sm" className="text-red-500 h-auto p-0 text-xs">
                                            Deletar rota /{p.slug}
                                        </Button>
                                    </form>
                                </div>
                            </TabsContent>
                        ))}

                        {/* Aba Nova Página */}
                        <TabsContent value="new" className="h-full">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Criar Nova Rota</CardTitle>
                                    <CardDescription>Adicione um endpoint JSON para este site.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form action={async (fd) => {
                                        await createPage(fd);
                                        toast.success("Página criada!");
                                    }} className="space-y-4">
                                        <input type="hidden" name="siteId" value={site.id} />
                                        <div className="space-y-2">
                                            <Label>Slug da URL (ex: &quot;produtos&quot;, &quot;promo-natal&quot;)</Label>
                                            <div className="flex items-center">
                                                <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-l-md border border-r-0 text-sm text-zinc-500">/</span>
                                                <Input name="slug" placeholder="minha-pagina" className="rounded-l-none" required />
                                            </div>
                                        </div>
                                        <Button type="submit">Criar Página</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}