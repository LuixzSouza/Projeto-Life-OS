import { prisma } from "@/lib/prisma";
import { createSite } from "./actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Plus,
  Server,
  LayoutTemplate,
  ArrowRight,
  FolderTree,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* -------------------------------------------------------------------------- */
/*                                    PAGE                                    */
/* -------------------------------------------------------------------------- */

export default async function CMSPage() {
  const sites = await prisma.managedSite.findMany({
    include: {
      pages: { orderBy: { slug: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
            <Server className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Headless CMS
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Gerencie conteúdo estruturado em JSON para sites, apps e integrações externas.
            </p>
          </div>
        </div>

        {/* Criar Projeto */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
            >
              <Plus className="h-5 w-5" />
              Novo Projeto
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Projeto CMS</DialogTitle>
              <DialogDescription>
                Cada projeto representa um site ou aplicação consumindo JSON.
              </DialogDescription>
            </DialogHeader>

            <form action={createSite} className="space-y-4">
              <div className="space-y-2">
                <Input
                  name="name"
                  placeholder="Nome do Projeto / Cliente"
                  required
                />
                <Input
                  name="url"
                  placeholder="Domínio (opcional)"
                />
              </div>

              <Button type="submit" className="w-full">
                Criar Projeto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* GRID DE PROJETOS                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sites.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl bg-muted/40 text-center">
            <Globe className="h-14 w-14 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-semibold">
              Nenhum projeto criado ainda
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie seu primeiro projeto para começar a servir conteúdo JSON.
            </p>
          </div>
        ) : (
          sites.map((site) => (
            <Card
              key={site.id}
              className="group flex flex-col transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              {/* HEADER CARD */}
              <CardHeader className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {site.pages.length} rotas
                  </Badge>
                </div>

                <CardTitle className="truncate">{site.name}</CardTitle>
                <CardDescription className="truncate">
                  {site.url || "Sem domínio configurado"}
                </CardDescription>
              </CardHeader>

              {/* CONTEÚDO */}
              <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Criado em{" "}
                  {new Date(site.createdAt).toLocaleDateString()}
                </div>

                <div className="flex items-start gap-2">
                  <FolderTree className="h-4 w-4 mt-0.5" />
                  <div className="flex gap-1 flex-wrap">
                    {site.pages.slice(0, 3).map((page) => (
                      <span
                        key={page.id}
                        className="px-2 py-0.5 rounded-md bg-muted border text-xs"
                      >
                        /{page.slug}
                      </span>
                    ))}
                    {site.pages.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{site.pages.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* FOOTER */}
              <CardFooter className="pt-0">
                <Link href={`/cms/${site.id}`} className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  >
                    Gerenciar Conteúdo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
