import { Sidebar } from "@/components/layout/sidebar"; // ou o caminho correto
import { CommandPalette } from "@/components/layout/command-palette";
import { FocusDock } from "@/components/focus/focus-dock";
import { BlockReminders } from "@/components/agenda/block-reminders";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getNotificationInbox } from "@/lib/notifications";

// Páginas do dashboard são conteúdo autenticado por-usuário: nunca devem ser
// prerenderizadas no build (consultariam o banco vazio na Vercel → erro P2021).
// force-dynamic garante render por requisição.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const inbox = await getNotificationInbox();

  // --- A CORREÇÃO ESTÁ AQUI ---
  // Criamos um objeto "limpo" apenas com o que o front precisa, 
  // ou convertemos os tipos complexos (Decimal -> Number)
  const serializedUser = user ? {
      ...user,
      salary: user.salary ? Number(user.salary) : 0, // Converte Decimal para Number
      createdAt: user.createdAt.toISOString(), // (Opcional) Previne erro de Data
      updatedAt: user.updatedAt.toISOString()  // (Opcional) Previne erro de Data
  } : null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-black">
      {/* Passamos o objeto tratado/serializado */}
      <Sidebar user={serializedUser} inbox={inbox} />

      <CommandPalette />

      {/* Modo Foco: widget global persistente (Pomodoro/cronômetro). Vive aqui no
          layout para não desmontar na navegação — o timer segue em qualquer rota. */}
      <FocusDock />

      {/* Lembretes de blocos: poller global que avisa quando um bloco vai começar. */}
      <BlockReminders />

      {/* pb no mobile: o bottom-nav é fixo (h-16) e cobriria os últimos ~64px do
          conteúdo. Reserva o espaço dele + a safe-area do iOS. No desktop (md+) o
          nav some e o padding zera. */}
      <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
    </div>
  );
}