// Página PÚBLICA de aniversário (sem login). O link assinado (HMAC) chega como
// /celebrar/<userId>.<friendId>.<sig>. Validamos o token, carregamos o amigo e
// renderizamos a mesma experiência da visão do dono — mas no modo "guest"
// (sem botões de editar/compartilhar). Link inválido mostra uma tela amigável.

import Link from "next/link";
import { Cake } from "lucide-react";
import { resolveCelebrationToken } from "@/app/(dashboard)/social/celebration-actions";
import { CelebrationStage } from "@/components/social/celebration-stage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Uma surpresa de aniversário 🎉",
  description: "Alguém preparou uma homenagem especial para você.",
};

export default async function PublicCelebrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await resolveCelebrationToken(token);

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/20 p-6 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
          <Cake className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Este link de celebração não pôde ser aberto. Pode ter sido copiado pela
          metade — peça para a pessoa enviar de novo, completo.
        </p>
        <Link href="/" className="mt-6 text-sm font-semibold text-primary hover:underline">
          Conhecer o Life OS
        </Link>
      </main>
    );
  }

  return <CelebrationStage data={data} variant="guest" />;
}
