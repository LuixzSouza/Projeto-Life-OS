import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/components/cms/site-editor"; // Componente novo que vamos criar
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface SitePageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailsPage({ params }: SitePageProps) {
  // 1. Desembrulha os params (Next.js 15 exige await)
  const { id } = await params;

  // 2. Busca o site e todas as páginas ordenadas
  const site = await prisma.managedSite.findUnique({
    where: { id },
    include: { 
        pages: { orderBy: { slug: 'asc' } } 
    }
  });

  // 3. Segurança: Se não achar, manda para página 404
  if (!site) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
      {/* Header de Navegação */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/cms">
            <Button variant="ghost" size="sm" className="gap-2 text-zinc-500">
                <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
        </Link>
        <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {site.name}
                <span className="text-xs font-normal text-zinc-400 border px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {site.pages.length} páginas
                </span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono">{site.url || "Sem URL configurada"}</p>
        </div>
      </div>

      {/* Área Principal (Editor Full Page) */}
      <SiteEditor site={site} />
    </div>
  );
}