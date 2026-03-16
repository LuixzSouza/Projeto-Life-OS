import { prisma } from "@/lib/prisma";
import { createSite } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Plus, Server, LayoutTemplate, ArrowRight, FolderTree, Clock, Database, Braces } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function CMSPage() {
  const sites = await prisma.managedSite.findMany({
    include: {
      pages: { orderBy: { slug: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#080808] animate-in fade-in duration-700 w-full overflow-x-hidden pb-20">
      
      {/* GLOWS DE FUNDO */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* HEADER TÁTICO FULL WIDTH */}
      <header className="sticky top-0 z-30 bg-[#F4F4F5]/80 dark:bg-[#080808]/80 backdrop-blur-xl border-b border-border/40 px-6 md:px-10 lg:px-14 py-6">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Server className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                Headless CMS
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase font-black bg-purple-500/10 text-purple-600 border-purple-500/20">Alpha</Badge>
              </h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Endpoints JSON & Env Vars Manager
              </p>
            </div>
          </div>

          {/* Criar Projeto */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl rounded-xl h-12 px-6 transition-all">
                <Plus className="h-4 w-4 mr-2" /> Novo App / Endpoint
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md rounded-[2rem] p-8 border-border/40 shadow-2xl bg-card">
              <DialogHeader className="mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
                  <Database className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Inicializar Instância</DialogTitle>
                <DialogDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Crie um novo container para armazenar rotas JSON e variáveis de ambiente.
                </DialogDescription>
              </DialogHeader>

              <form action={createSite} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome do Container</label>
                    <Input name="name" placeholder="Ex: Website Institucional" required className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-bold focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2"><Globe className="h-3 w-3"/> Domínio Alvo (Opcional)</label>
                    <Input name="url" placeholder="https://meusite.com.br" className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-mono text-xs focus-visible:ring-primary/20" />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 mt-2">
                  Criar Container <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* GRID DE PROJETOS FULL WIDTH */}
      <main className="w-full px-6 md:px-10 lg:px-14 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {sites.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 text-center">
              <div className="h-24 w-24 rounded-[2rem] bg-muted/50 flex items-center justify-center mb-6 shadow-inner border border-border/20">
                  <Braces className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter opacity-30 italic">Nenhum Endpoint Ativo</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mt-3 max-w-[300px] leading-relaxed">
                Inicie um novo container para começar a distribuir dados via API Rest.
              </p>
            </div>
          ) : (
            sites.map((site) => (
              <Card key={site.id} className="group flex flex-col bg-card border-border/40 rounded-[2rem] shadow-sm hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 p-2">
                <CardHeader className="space-y-4 px-4 pt-4 pb-0">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-[1rem] bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                      <LayoutTemplate className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-muted/50 border-border/40 h-6 px-2">
                      {site.pages.length} Rotas
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-lg font-black tracking-tight truncate group-hover:text-primary transition-colors">{site.name}</CardTitle>
                    <CardDescription className="text-xs font-mono font-semibold text-muted-foreground/60 truncate mt-1">
                      {site.url || "sys.local/env"}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 text-xs font-medium text-muted-foreground px-4 mt-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-muted/20 p-2 rounded-lg border border-border/20">
                    <Clock className="h-3 w-3" />
                    Deploy: {new Date(site.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-start gap-2">
                    <FolderTree className="h-4 w-4 mt-0.5 text-muted-foreground/40" />
                    <div className="flex gap-1.5 flex-wrap">
                      {site.pages.slice(0, 3).map((page) => (
                        <span key={page.id} className="px-2 py-1 rounded-md bg-muted/30 border border-border/40 text-[10px] font-mono font-bold text-foreground/70">
                          /{page.slug}
                        </span>
                      ))}
                      {site.pages.length > 3 && (
                        <span className="px-2 py-1 rounded-md bg-muted/10 border border-dashed border-border/40 text-[10px] font-black">
                          +{site.pages.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-2 mt-4">
                  <Link href={`/cms/${site.id}`} className="w-full">
                    <Button variant="secondary" className="w-full h-12 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all shadow-sm">
                      Acessar Terminal <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}