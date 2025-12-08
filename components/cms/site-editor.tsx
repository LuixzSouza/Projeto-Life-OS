"use client";

import { useState } from "react";
import { ManagedSite, SitePage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Copy, Check, FileJson, Settings, Code, Layout } from "lucide-react";
import { toast } from "sonner";
import { savePageContent, createPage, deletePage, deleteSite } from "@/app/(dashboard)/cms/actions";
import { useRouter } from "next/navigation";

interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}

// --- SUB-COMPONENTE: EDITOR JSON ---
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
            toast.success("Conteúdo salvo com sucesso!");
        } catch {
            toast.error("Erro ao salvar.");
        }
    };

    const handleDelete = async () => {
        if(confirm(`Tem certeza que deseja apagar a rota /${page.slug}?`)) {
            await deletePage(page.id);
            toast.success("Página removida.");
        }
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm font-mono px-3 py-1">/{page.slug}</Badge>
                    {!isValid ? (
                        <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                            ⚠️ JSON Inválido
                        </span>
                    ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Válido
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!isValid} className="gap-2">
                        <Save className="h-4 w-4" /> Salvar Alterações
                    </Button>
                </div>
            </div>

            <Textarea 
                value={json}
                onChange={handleChange}
                className={`font-mono text-sm flex-1 bg-zinc-950 text-green-400 border-zinc-800 resize-none p-6 leading-relaxed ${!isValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                spellCheck={false}
            />
        </div>
    );
}

// --- SUB-COMPONENTE: ABA API ---
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
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Integração</CardTitle>
                    <CardDescription>Como consumir os dados deste site no seu Frontend (React, Vue, etc).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>API Key (Privada)</Label>
                        <div className="flex gap-2">
                            <Input value={site.apiKey} readOnly className="font-mono bg-zinc-50 dark:bg-zinc-900" />
                            <Button variant="outline" onClick={() => copyToClip(site.apiKey)}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Exemplo de Fetch (Javascript)</Label>
                        <div className="bg-zinc-950 text-zinc-300 p-4 rounded-md font-mono text-xs overflow-x-auto relative group">
                            <pre>{`const res = await fetch('${baseUrl}/api/cms/${site.apiKey}/home');
const data = await res.json();
console.log(data.titulo);`}</pre>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white hover:text-white hover:bg-zinc-800"
                                onClick={() => copyToClip(`${baseUrl}/api/cms/${site.apiKey}/home`)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// --- COMPONENTE PRINCIPAL: SITE EDITOR ---
export function SiteEditor({ site }: { site: SiteWithPages }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(site.pages[0]?.id || "settings");

    const handleDeleteSite = async () => {
        const confirmName = prompt(`Para deletar, digite o nome do site: "${site.name}"`);
        if (confirmName === site.name) {
            await deleteSite(site.id);
            toast.success("Site excluído permanentemente.");
            router.push("/cms"); // Redireciona para a listagem
        } else {
            toast.error("Nome incorreto. Cancelado.");
        }
    };

    return (
        <div className="flex-1 flex gap-6 overflow-hidden">
            
            {/* SIDEBAR DO EDITOR */}
            <aside className="w-64 flex flex-col gap-2 shrink-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="h-full flex flex-col">
                    
                    <div className="font-semibold text-xs text-zinc-500 uppercase tracking-wider mb-2 px-2">Páginas</div>
                    <ScrollArea className="flex-1 pr-3">
                        <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                            {site.pages.map(page => (
                                <TabsTrigger 
                                    key={page.id} 
                                    value={page.id}
                                    className="w-full justify-start px-3 py-2 h-9 data-[state=active]:bg-zinc-200 dark:data-[state=active]:bg-zinc-800 font-normal"
                                >
                                    <FileJson className="mr-2 h-4 w-4 text-zinc-500" />
                                    <span className="truncate">/{page.slug}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </ScrollArea>

                    <Separator className="my-3" />

                    <div className="font-semibold text-xs text-zinc-500 uppercase tracking-wider mb-2 px-2">Configuração</div>
                    <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                        <TabsTrigger value="new-page" className="w-full justify-start px-3 py-2 h-9 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-foreground">
                            <Plus className="mr-2 h-4 w-4" /> Nova Página
                        </TabsTrigger>
                        <TabsTrigger value="api" className="w-full justify-start px-3 py-2 h-9 data-[state=active]:bg-zinc-200 dark:data-[state=active]:bg-zinc-800">
                            <Code className="mr-2 h-4 w-4" /> API & Chaves
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="w-full justify-start px-3 py-2 h-9 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 data-[state=active]:bg-red-100">
                            <Settings className="mr-2 h-4 w-4" /> Zona de Perigo
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </aside>

            {/* ÁREA DE CONTEÚDO */}
            <main className="flex-1 bg-white dark:bg-zinc-950 rounded-xl border shadow-sm p-6 overflow-hidden flex flex-col">
                <Tabs value={activeTab} className="h-full flex flex-col">
                    
                    {/* Renderização das Páginas */}
                    {site.pages.map(page => (
                        <TabsContent key={page.id} value={page.id} className="h-full mt-0">
                            <JsonEditor page={page} />
                        </TabsContent>
                    ))}

                    {/* Criar Nova Página */}
                    <TabsContent value="new-page" className="h-full mt-0">
                        <div className="max-w-md mx-auto mt-10">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Adicionar Nova Rota</CardTitle>
                                    <CardDescription>Cria um novo endpoint JSON para este site.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form action={async (fd) => {
                                        await createPage(fd);
                                        toast.success("Página criada com sucesso!");
                                        // Não precisamos mudar a tab manualmente, o revalidate vai atualizar a lista 
                                        // e podemos deixar o usuário clicar na nova página.
                                    }} className="space-y-4">
                                        <input type="hidden" name="siteId" value={site.id} />
                                        <div className="space-y-2">
                                            <Label>Slug da URL (ex: &quot;quem-somos&quot;)</Label>
                                            <div className="flex items-center">
                                                <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-l-md border border-r-0 text-sm text-zinc-500">/</span>
                                                <Input name="slug" placeholder="minha-pagina" className="rounded-l-none" required autoFocus />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full">Criar Página</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Guia da API */}
                    <TabsContent value="api" className="h-full mt-0">
                        <ApiGuide site={site} />
                    </TabsContent>

                    {/* Configurações (Deletar) */}
                    <TabsContent value="settings" className="h-full mt-0">
                        <div className="max-w-2xl space-y-6">
                            <Card className="border-red-500/30 bg-red-50/10">
                                <CardHeader>
                                    <CardTitle className="text-red-600">Deletar Projeto</CardTitle>
                                    <CardDescription>
                                        Esta ação é irreversível. Todas as páginas e conteúdos JSON serão apagados permanentemente.
                                        A API Key deixará de funcionar imediatamente.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="destructive" onClick={handleDeleteSite}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir {site.name}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}