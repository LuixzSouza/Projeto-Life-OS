// Visão do DONO da página de aniversário (autenticada). Mostra a homenagem
// pronta + botões de compartilhar e regenerar. O amigo é resolvido por id+userId.

import { notFound } from "next/navigation";
import { getCelebrationForFriend } from "../../celebration-actions";
import { CelebrationStage } from "@/components/social/celebration-stage";

export const dynamic = "force-dynamic";

export default async function OwnerCelebrationPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  const data = await getCelebrationForFriend(friendId);
  if (!data) notFound();

  return <CelebrationStage data={data} variant="owner" />;
}
