"use client";

import { useState } from "react";
import { ManagedSite, SitePage } from "@prisma/client";
import { toast } from "sonner";

import {
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
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Plus,
  Trash2,
  Code2,
  ExternalLink,
  Database,
  ShieldCheck,
  Globe,
  Loader2
} from "lucide-react";

import { CopyButton } from "./copy-button";
import { EndpointEditor } from "./endpoint-editor";

/* ======================================================
   TYPES
====================================================== */
interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
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
                aria-label="Excluir site"
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
              {/* LISTA DE PÁGINAS COM O EDITOR DE ENDPOINT */}
              {site.pages.map((page) => (
                <TabsContent
                  key={page.id}
                  value={page.id}
                  className="h-full m-0 focus-visible:ring-0"
                >
                  <EndpointEditor page={page} />

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
                          if (activeTab === page.id) setActiveTab("new");
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
