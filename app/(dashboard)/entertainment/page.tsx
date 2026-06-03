import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EntertainmentBoard } from "@/components/entertainment/entertainment-board";
import { AddMediaDialog } from "@/components/entertainment/add-media-dialog";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */
/* Server Component — responsável apenas por buscar dados e estruturar layout */

export default async function EntertainmentPage() {
  // 1. Busca os itens no banco
  const userId = await getCurrentUserId();
  const rawItems = await prisma.mediaItem.findMany({
    where: { userId, deletedAt: null },
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
    <PageShell>
      <PageHeader
        icon={<Star className="h-6 w-6 fill-current" />}
        title="Entretenimento"
        description="Seu catálogo pessoal de filmes, séries, jogos, álbuns e livros."
        actions={<AddMediaDialog />}
      />

      <PageContainer>
        <EntertainmentBoard initialItems={items} />
      </PageContainer>
    </PageShell>
  );
}