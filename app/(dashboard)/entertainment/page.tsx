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
    <div className="max-w-7xl mx-auto p-6 md:p-10 pb-20 space-y-10">
      
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        
        <div className="flex items-center gap-4">
          {/* Ícone */}
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm">
            <Star className="h-6 w-6 fill-current" />
          </div>

          {/* Título */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Entretenimento
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Gerencie seus filmes, jogos e músicas.
            </p>
          </div>
        </div>

        {/* Ação principal */}
        <AddMediaDialog />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* BOARD (Client Component)                                            */}
      {/* ------------------------------------------------------------------ */}
      {/* O board assume toda a interação, filtros e estados */}
      <EntertainmentBoard initialItems={items} />

    </div>
  );
}
