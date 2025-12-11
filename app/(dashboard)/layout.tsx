import { Sidebar } from "@/components/layout/sidebar"; // ou o caminho correto
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await prisma.user.findFirst();

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
      <Sidebar user={serializedUser} /> 
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}