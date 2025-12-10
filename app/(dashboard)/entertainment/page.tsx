import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EntertainmentBoard } from "@/components/entertainment/entertainment-board";
import { AddMediaDialog } from "@/components/entertainment/add-media-dialog";

// Esta função DEVE ser async para buscar dados do banco
export default async function EntertainmentPage() {
  // Busca tudo de uma vez, ordenado por criação
  const items = await prisma.mediaItem.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 pb-20 space-y-8">
      
      {/* Header Estático */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                <Star className="h-6 w-6 fill-current" />
            </div>
            <div>
                <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Entretenimento
                </h1>
                <p className="text-zinc-500 text-sm font-medium">
                    Gerencie seus filmes, jogos e músicas.
                </p>
            </div>
        </div>
        
        {/* O Dialog de adicionar fica aqui ou dentro do Board, você escolhe. 
            Coloquei aqui para ficar visível no header. */}
        <AddMediaDialog />
      </div>

      {/* O Board Interativo (Client Component) assume o controle aqui */}
      {/* Passamos os dados do servidor (items) como prop inicial */}
      <EntertainmentBoard initialItems={items} />

    </div>
  );
}