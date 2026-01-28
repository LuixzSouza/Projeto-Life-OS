import { prisma } from "@/lib/prisma"
import { LockKeyhole, ShieldCheck } from "lucide-react"
import { AccessView } from "@/components/access/access-view"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cofre de Senhas | Life OS",
}

export default async function AccessPage() {
  // 1. Data Fetching
  // REMOVI O 'select'. Agora ele busca tudo (incluindo notes, userId, createdAt)
  // para satisfazer a tipagem do AccessItem e permitir a busca por notas.
  const allItems = await prisma.accessItem.findMany({
    orderBy: { title: "asc" },
  })

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* -------------------------------------------------------------------------------------------------
       * HEADER COM VISUAL DE COFRE
       * ------------------------------------------------------------------------------------------------- */}
      <header className="border-b border-border/60 bg-gradient-to-b from-slate-100/50 to-background dark:from-slate-900/20 dark:to-background pt-12 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 w-fit">
                <ShieldCheck className="h-3 w-3" /> Ambiente Seguro & Criptografado
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20 text-primary-foreground">
                  <LockKeyhole className="h-7 w-7" />
                </div>
                Cofre de Acessos
              </h1>

              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Gerencie credenciais pessoais e corporativas em um único lugar. 
                Seus dados nunca saem do seu dispositivo sem criptografia.
              </p>
            </div>

            {/* Stats Rápidos */}
            <div className="flex gap-4 self-start md:self-end">
                <div className="bg-card border rounded-lg p-3 px-5 text-center shadow-sm">
                    <span className="block text-2xl font-bold text-foreground">{allItems.length}</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Itens Totais</span>
                </div>
                <div className="bg-card border rounded-lg p-3 px-5 text-center shadow-sm hidden sm:block">
                    {/* Filtra itens que possuem cliente (não nulo e não vazio) */}
                    <span className="block text-2xl font-bold text-foreground">{allItems.filter(i => i.client).length}</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Clientes</span>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------------------------------------
       * CONTEÚDO PRINCIPAL (CLIENT COMPONENT)
       * ------------------------------------------------------------------------------------------------- */}
      <main className="px-6 md:px-8 py-8 max-w-[1600px] mx-auto -mt-4">
        <AccessView initialItems={allItems} />
      </main>
    </div>
  )
}