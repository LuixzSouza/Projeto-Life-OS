import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EntertainmentBoard } from "@/components/entertainment/entertainment-board";
import { AddMediaDialog } from "@/components/entertainment/add-media-dialog";

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */
/* Server Component — responsável apenas por buscar dados e estruturar layout */

export default async function EntertainmentPage() {
  // Busca todos os itens ordenados por criação (mais recentes primeiro)
  const items = await prisma.mediaItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in fade-in duration-500">
          
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
                Gerencie seus filmes, jogos e músicas em um painel unificado.
              </p>
            </div>
          </div>

          {/* Ação principal */}
          <div className="shrink-0">
            <AddMediaDialog />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* BOARD (Client Component)                                            */}
      {/* ------------------------------------------------------------------ */}
      {/* O board assume toda a interação, filtros e estados */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <EntertainmentBoard initialItems={items} />
      </main>
    </div>
  );
}
