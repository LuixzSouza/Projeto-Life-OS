import { Sidebar } from "@/components/layout/sidebar";
import { prisma } from "@/lib/prisma"; // Importe o prisma

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Buscar usuário para a sidebar
  const user = await prisma.user.findFirst();

  return (
    <div className="flex min-h-screen bg-zinc-50/50 dark:bg-zinc-900/50">
      <Sidebar user={user} /> {/* Passando os dados */}

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}