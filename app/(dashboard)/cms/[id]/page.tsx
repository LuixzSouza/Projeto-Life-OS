// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/components/cms/site-editor"; // Esse componente vamos melhorar no próximo passo!
import { ArrowLeft, Globe, ExternalLink, HardDrive } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/lib/auth";

interface SitePageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailsPage(props: SitePageProps) {
  const params = await props.params;
  const { id } = params;

  const userId = await getCurrentUserId();

  const site = await prisma.managedSite.findFirst({
    where: { id, userId },
    include: {
      pages: { orderBy: { slug: "asc" } },
    },
  });

  if (!site) return notFound();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col w-full overflow-x-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER TÁTICO FULL WIDTH */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 md:px-10 lg:px-14 py-4 flex flex-col gap-5 animate-in fade-in duration-500">
        
        {/* NAV & VOLTAR */}
        <div className="flex items-center gap-4 border-b border-border/40 pb-4">
            <Link href="/cms" className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="hidden sm:inline">Headless CMS</span>
                <span className="opacity-40 hidden sm:inline">/</span>
                <span className="font-semibold text-foreground">{site.name}</span>
            </div>
        </div>

        {/* INFO DO PROJETO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-card border border-border/60 shadow-lg flex items-center justify-center text-foreground">
                    <HardDrive className="h-6 w-6 opacity-80" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {site.name}
                        </h1>
                        <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 px-2 h-5">
                            {site.pages.length} {site.pages.length === 1 ? "endpoint" : "endpoints"}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Globe className="h-3.5 w-3.5 opacity-50" />
                        <span className="font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/40 truncate max-w-[300px]">
                            {site.url || "sys.local/env"}
                        </span>

                        {site.url && (
                            <Link
                                href={site.url}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/70 transition-colors bg-primary/5 px-2 py-0.5 rounded border border-primary/10 ml-1"
                                title="Abrir domínio externo"
                            >
                                <ExternalLink className="h-3 w-3" /> Live
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ROTAS RÁPIDAS (Badges) */}
            <div className="hidden lg:flex flex-wrap gap-2 max-w-md justify-end">
                {site.pages.slice(0, 5).map((page) => (
                    <Badge
                        key={page.id}
                        variant="outline"
                        className="font-mono text-[10px] font-bold border-border/40 bg-card/50 px-2 py-1 shadow-sm"
                    >
                        /{page.slug}
                    </Badge>
                ))}
                {site.pages.length > 5 && (
                    <Badge variant="outline" className="text-[10px] font-black border-border/40 bg-muted/40">
                        +{site.pages.length - 5}
                    </Badge>
                )}
            </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* TERMINAL EDITOR */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 w-full px-4 md:px-10 lg:px-14 py-8">
        <div className="h-[calc(100vh-200px)] rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
          <SiteEditor site={site} />
        </div>
      </main>
    </div>
  );
}