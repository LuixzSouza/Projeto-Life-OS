import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EntertainmentBoard } from "@/components/entertainment/entertainment-board";
import { AddMediaDialog } from "@/components/entertainment/add-media-dialog";

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */
/* Server Component — responsável apenas por buscar dados e estruturar layout */

export default async function EntertainmentPage() {
  // 1. Busca os itens no banco
  const rawItems = await prisma.mediaItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  // 2. Formata os dados para garantir que o Client Component não quebre com "nulls" não esperados
  const items = rawItems.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type, // "MOVIE", "TV_SHOW", "GAME", "ALBUM", "BOOK"
    status: item.status, // "PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "DROPPED"
    overview: item.overview || null,
    coverUrl: item.coverUrl || null,
    genres: item.genres || null,
    creator: item.creator || null,
    releaseYear: item.releaseYear || null,
    externalId: item.externalId || null,
    rating: item.rating,
    notes: item.notes || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background w-full pb-12">
      
     <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-6 md:px-8 py-6">
        <div className=" mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Título e Ícone */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Star className="h-6 w-6 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Entretenimento
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Seu catálogo pessoal de filmes, séries, jogos, álbuns e livros.
              </p>
            </div>
          </div>

          {/* Ação principal (O Modal de Busca via API) */}
          <div className="shrink-0 w-full md:w-auto flex">
            <AddMediaDialog />
          </div>
        </div>
      </header>

      <main className=" mx-auto w-full px-6 md:px-8 py-8 animate-in fade-in duration-500">
        <EntertainmentBoard initialItems={items} />
      </main>
      
    </div>
  );
}