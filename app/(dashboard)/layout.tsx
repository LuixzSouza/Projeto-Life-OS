import { Sidebar } from "@/components/layout/sidebar"; // ou o caminho correto
import { CommandPalette } from "@/components/layout/command-palette";
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

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}