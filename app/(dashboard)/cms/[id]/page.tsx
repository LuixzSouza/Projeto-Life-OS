import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/components/cms/site-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface SitePageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailsPage({ params }: SitePageProps) {
  const { id } = await params;

  const site = await prisma.managedSite.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { slug: "asc" } },
    },
  });

  if (!site) return notFound();

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] gap-6 space-y-10 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/cms">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {site.name}
              </h1>
              <Badge variant="secondary" className="text-xs">
                {site.pages.length} páginas
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="font-mono">
                {site.url || "Sem URL configurada"}
              </span>
              {site.url && (
                <Link
                  href={site.url}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {site.pages.slice(0, 6).map((page) => (
            <Badge
              key={page.id}
              variant="outline"
              className="font-mono text-[11px]"
            >
              /{page.slug}
            </Badge>
          ))}
          {site.pages.length > 6 && (
            <Badge variant="outline" className="text-[11px]">
              +{site.pages.length - 6}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        <SiteEditor site={site} />
      </div>
    </div>
  );
}
