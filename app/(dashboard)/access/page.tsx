import { prisma } from "@/lib/prisma";
import { LockKeyhole } from "lucide-react";
import { AccessDialog } from "@/components/access/access-dialog";
import { AccessList } from "@/components/access/access-list"; // <--- Novo

export default async function AccessPage() {
  const items = await prisma.accessItem.findMany({
    orderBy: { title: 'asc' }
  });

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-black p-6 md:p-10 space-y-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-zinc-500/20">
                    <LockKeyhole className="h-6 w-6" />
                </div>
                Cofre de Senhas
            </h1>
            <p className="text-zinc-500 mt-1 ml-14">Acessos criptografados (AES-256).</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
              <AccessDialog />
          </div>
      </header>

      {/* Lista com Busca Integrada */}
      <AccessList items={items} />

    </div>
  );
}