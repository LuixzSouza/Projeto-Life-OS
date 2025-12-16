import { prisma } from "@/lib/prisma";
import { LockKeyhole } from "lucide-react";
import { AccessDialog } from "@/components/access/access-dialog";
import { AccessList } from "@/components/access/access-list";

export default async function AccessPage() {
  const items = await prisma.accessItem.findMany({
    orderBy: { title: "asc" },
  });

  return (
    <section className="min-h-screen bg-muted/30 dark:bg-background px-6 py-8 md:px-10 md:py-12 space-y-10">
      {/* HEADER */}
      <header className="flex flex-col gap-6 border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* TÍTULO */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <LockKeyhole className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Cofre de Senhas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie seus acessos com criptografia de nível militar (AES-256)
              </p>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="flex items-center gap-3">
            <AccessDialog />
          </div>
        </div>

        {/* INFO BAR */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            🔐 Dados criptografados localmente
          </span>
          <span className="flex items-center gap-2">
            ⚡ Acesso rápido e seguro
          </span>
          <span className="flex items-center gap-2">
            🧠 Ideal para uso pessoal ou profissional
          </span>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="space-y-6">
        <AccessList items={items} />
      </main>
    </section>
  );
}
