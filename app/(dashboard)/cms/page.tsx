import { prisma } from "@/lib/prisma";
import { createSite, savePageContent } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, FileJson, Key, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function CMSPage() {
  const sites = await prisma.managedSite.findMany({
    include: { pages: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-blue-500" /> Gestor de Sites (CMS)
        </h1>
        
        {/* Modal Novo Site */}
        <Dialog>
            <DialogTrigger asChild>
                <Button><FileJson className="mr-2 h-4 w-4" /> Novo Site</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar Site</DialogTitle></DialogHeader>
                <form action={createSite} className="space-y-4">
                    <Input name="name" placeholder="Nome (Ex: Padaria do Zé)" required />
                    <Input name="url" placeholder="URL (Ex: https://padaria.com)" />
                    <Button type="submit" className="w-full">Criar</Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {sites.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg text-zinc-500">
                Nenhum site gerenciado ainda. Crie o primeiro acima.
             </div>
        ) : sites.map(site => (
            <Card key={site.id} className="overflow-hidden">
                <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{site.name}</CardTitle>
                            <CardDescription>{site.url || "Sem URL definida"}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-3 py-1 rounded-full border border-yellow-200 font-mono">
                            <Key className="h-3 w-3" /> API Key: {site.apiKey}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs defaultValue="home" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="home">Home (/home)</TabsTrigger>
                                <TabsTrigger value="sobre">Sobre (/sobre)</TabsTrigger>
                                <TabsTrigger value="contato">Contato (/contato)</TabsTrigger>
                            </TabsList>
                            <p className="text-xs text-zinc-400">Edite o JSON de cada página abaixo</p>
                        </div>

                        {/* Gerador de Abas de Conteúdo */}
                        {["home", "sobre", "contato"].map(slug => {
                            const currentPage = site.pages.find(p => p.slug === slug);
                            const defaultJson = currentPage?.content || `{\n  "titulo": "Título da ${slug}",\n  "texto": "Conteúdo aqui..."\n}`;

                            return (
                                <TabsContent key={slug} value={slug}>
                                    <form action={savePageContent} className="space-y-4">
                                        <input type="hidden" name="siteId" value={site.id} />
                                        <input type="hidden" name="slug" value={slug} />
                                        
                                        <div className="relative">
                                            <div className="absolute top-2 right-2 text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 rounded">JSON</div>
                                            <Textarea 
                                                name="content" 
                                                defaultValue={defaultJson}
                                                className="font-mono text-sm min-h-[200px] bg-zinc-950 text-green-400 border-zinc-800"
                                            />
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-zinc-500">
                                                Endpoint: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">/api/cms/{site.apiKey}/{slug}</code>
                                            </div>
                                            <Button size="sm">Salvar Alterações</Button>
                                        </div>
                                    </form>
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}