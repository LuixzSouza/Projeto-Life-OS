import { prisma } from "@/lib/prisma";
import { createSite } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Plus, Server, LayoutTemplate, ExternalLink, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link"; // Importante: Usamos Link agora

export default async function CMSPage() {
  const sites = await prisma.managedSite.findMany({
    include: { pages: { orderBy: { slug: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Server className="text-indigo-500" /> Headless CMS
            </h1>
            <p className="text-zinc-500">Gerencie conteúdo JSON para seus sites e aplicativos externos.</p>
        </div>
        
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Criar Novo Projeto
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Novo Projeto CMS</DialogTitle></DialogHeader>
                <form action={createSite} className="space-y-4">
                    <div className="space-y-2">
                        <Input name="name" placeholder="Nome do Cliente / Projeto" required />
                        <Input name="url" placeholder="Domínio (ex: https://meusite.com)" />
                    </div>
                    <Button type="submit" className="w-full">Criar Projeto</Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      {/* Grid de Sites */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sites.length === 0 ? (
             <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-500">
                <Globe className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Nenhum projeto ativo.</p>
                <p className="text-sm">Crie seu primeiro site para começar a servir JSON.</p>
             </div>
        ) : sites.map(site => (
            <Card key={site.id} className="group hover:border-indigo-500/50 transition-colors flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mb-2">
                            <LayoutTemplate className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500">
                            {site.pages.length} rotas
                        </span>
                    </div>
                    <CardTitle className="truncate">{site.name}</CardTitle>
                    <CardDescription className="truncate">{site.url || "Localhost / Sem domínio"}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                    <div className="text-xs text-zinc-500 space-y-1">
                        <p>Última atualização: {new Date(site.createdAt).toLocaleDateString()}</p>
                        <div className="flex gap-1 flex-wrap mt-2">
                            {site.pages.slice(0, 3).map(p => (
                                <span key={p.id} className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border">
                                    /{p.slug}
                                </span>
                            ))}
                            {site.pages.length > 3 && <span className="text-zinc-400">+{site.pages.length - 3}</span>}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-0 flex gap-2">
                    {/* Botão Principal: Vai para a ROTA DINÂMICA NOVA */}
                    <Link href={`/cms/${site.id}`} className="w-full">
                        <Button variant="secondary" className="w-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            Gerenciar Conteúdo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        ))}
      </div>
    </div>
  );
}