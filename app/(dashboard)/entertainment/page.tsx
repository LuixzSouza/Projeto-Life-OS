import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EntertainmentBoard } from "@/components/entertainment/entertainment-board";
import { AddMediaDialog } from "@/components/entertainment/add-media-dialog";

/* -------------------------------------------------------------------------- */
/* PAGE                                     */
/* -------------------------------------------------------------------------- */
/* Server Component — responsável apenas por buscar dados e estruturar layout */

export default async function EntertainmentPage() {
  // 1. Busca os itens no banco, garantindo a tipagem correta
  const rawItems = await prisma.mediaItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  // 2. Formata os dados para garantir que o Client Component não quebre com "nulls" não esperados
  const items = rawItems.map(item => ({
    id: item.id,
    title: item.title,
    type: item.type, // "MOVIE", "TV", "GAME", "ALBUM"
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
    <div className="min-h-screen bg-background pb-24">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          
          <div className="flex items-center gap-4">
            {/* Ícone */}
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm">
              <Star className="h-6 w-6 fill-current" />
            </div>

            {/* Título */}
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Entretenimento
              </h1>
              <p className="text-sm md:text-base font-medium text-muted-foreground max-w-xl">
                Seu catálogo pessoal. Acompanhe filmes, séries, jogos e álbuns que você consome.
              </p>
            </div>
          </div>

          {/* Ação principal (O Modal de Busca via API) */}
          <div className="shrink-0">
            <AddMediaDialog />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* BOARD (Client Component)                                           */}
      {/* ------------------------------------------------------------------ */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <EntertainmentBoard initialItems={items} />
      </main>
    </div>
  );
}