// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Server, LayoutTemplate, ArrowRight, FolderTree, Braces } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SiteActionsMenu } from "@/components/cms/site-actions-menu";
import { NewSiteDialog } from "@/components/cms/new-site-dialog";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

export default async function CMSPage() {
  const userId = await getCurrentUserId();
  const sites = await prisma.managedSite.findMany({
    where: { userId },
    include: {
      pages: { orderBy: { slug: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <PageHeader
        icon={<Server className="h-6 w-6" />}
        title={
          <span className="flex items-center gap-3">
            Headless CMS
            <Badge variant="secondary" className="px-2 text-[10px] font-medium bg-primary/10 text-primary">Alpha</Badge>
          </span>
        }
        description="Gerencie containers, endpoints JSON e variáveis de ambiente."
        actions={<NewSiteDialog />}
      />

      {/* GRID DE PROJETOS */}
      <PageContainer>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          
          {sites.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-2xl bg-muted/5 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Braces className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Nenhum container ativo</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
                Crie um container para começar a distribuir dados via API REST.
              </p>
              <NewSiteDialog />
            </div>
          ) : (
            sites.map((site) => (
              <Card key={site.id} className="group flex flex-col bg-card border-border/40 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md overflow-hidden">
                
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <LayoutTemplate className="h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-medium bg-muted text-muted-foreground">
                        {site.pages.length} {site.pages.length === 1 ? 'Rota' : 'Rotas'}
                      </Badge>
                      <SiteActionsMenu site={site} />
                    </div>
                  </div>

                  <div>
                    <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                        <Link href={`/cms/${site.id}`} className="focus:outline-none">
                            {site.name}
                        </Link>
                    </CardTitle>
                    <CardDescription className="text-xs font-mono truncate mt-1">
                      {site.url || "sys.local/env"}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-5 pt-2 space-y-4">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <FolderTree className="h-4 w-4 shrink-0 mt-0.5 opacity-60" />
                    <div className="flex gap-1.5 flex-wrap">
                      {site.pages.length === 0 ? (
                          <span className="italic opacity-60">Sem rotas</span>
                      ) : (
                          <>
                            {site.pages.slice(0, 3).map((page) => (
                                <span key={page.id} className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/40 font-mono text-[10px] text-foreground/80">
                                /{page.slug}
                                </span>
                            ))}
                            {site.pages.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-muted/20 border border-dashed border-border/40 font-mono text-[10px]">
                                +{site.pages.length - 3}
                                </span>
                            )}
                          </>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-0 border-t border-border/40 bg-muted/5">
                  <Link href={`/cms/${site.id}`} className="w-full flex items-center justify-center gap-2 p-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
                    Abrir Editor <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardFooter>

              </Card>
            ))
          )}
        </div>
      </PageContainer>
    </PageShell>
  );
}