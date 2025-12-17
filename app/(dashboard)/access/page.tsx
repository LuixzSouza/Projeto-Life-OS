import { prisma } from "@/lib/prisma"
import { LockKeyhole, Briefcase, User, ShieldCheck } from "lucide-react"
import { AccessDialog } from "@/components/access/access-dialog"
import { AccessList } from "@/components/access/access-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Página Principal
 * ------------------------------------------------------------------------------------------------- */
export default async function AccessPage() {
  // 1. Data Fetching
  const allItems = await prisma.accessItem.findMany({
    orderBy: { title: "asc" },
  })

  // 2. Business Logic
  const personalItems = allItems.filter(item => !item.client)
  const clientItems = allItems.filter(
    item => item.client !== null && item.client !== ""
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* -------------------------------------------------------------------------------------------------
       * HEADER — PADRÃO ENTERPRISE (IGUAL AO EXEMPLO)
       * ------------------------------------------------------------------------------------------------- */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
          
          {/* Título + Ações */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-primary rounded-lg shadow-lg shadow-primary/25">
                  <LockKeyhole className="h-6 w-6 text-primary-foreground" />
                </div>
                Cofre de Senhas
              </h1>

              <p className="text-muted-foreground text-lg max-w-2xl">
                Gerencie seus{" "}
                <span className="font-semibold text-foreground">
                  {allItems.length}
                </span>{" "}
                acessos com criptografia de nível militar. Seus dados permanecem
                sob seu controle total.
              </p>
            </div>

            {/* Ação Principal */}
            <div className="flex items-center gap-3">
              {/* Dialog já deve usar variant="primary" internamente */}
              <AccessDialog />
            </div>
          </div>

          {/* Barra Informativa */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm pt-4 border-t border-border/60">
            <span className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Criptografia AES-256
            </span>

            <span className="text-muted-foreground">
              🔐 {personalItems.length} acessos pessoais
            </span>

            <span className="text-muted-foreground">
              💼 {clientItems.length} acessos de clientes
            </span>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------------------------------------
       * MAIN
       * ------------------------------------------------------------------------------------------------- */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <Tabs defaultValue="PERSONAL" className="space-y-8">

          {/* Seletor de Abas */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <TabsList className="bg-muted p-1 rounded-xl shadow-sm">
              <TabsTrigger
                value="PERSONAL"
                className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md"
              >
                <User className="h-4 w-4" />
                Pessoal
                <span className="ml-1.5 text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full font-medium">
                  {personalItems.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="CLIENTS"
                className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md"
              >
                <Briefcase className="h-4 w-4" />
                Clientes
                <span className="ml-1.5 text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full font-medium">
                  {clientItems.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo — Pessoal */}
          <TabsContent
            value="PERSONAL"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {personalItems.length > 0 ? (
              <AccessList items={personalItems} />
            ) : (
              <EmptyState
                title="Nenhum acesso pessoal salvo"
                sub="Adicione logins de bancos, redes sociais ou contas pessoais."
                icon={User}
              />
            )}
          </TabsContent>

          {/* Conteúdo — Clientes */}
          <TabsContent
            value="CLIENTS"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {clientItems.length > 0 ? (
              <AccessList items={clientItems} showClientBadge />
            ) : (
              <EmptyState
                title="Nenhum acesso de cliente registrado"
                sub="Aqui aparecerão acessos vinculados a projetos e clientes."
                icon={Briefcase}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Empty State — Consistente com Design System
 * ------------------------------------------------------------------------------------------------- */
function EmptyState({
  title,
  sub,
  icon: Icon = LockKeyhole,
}: {
  title: string
  sub: string
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border/60 bg-card/50 shadow-sm text-center">
      <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="text-xl font-semibold text-foreground">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mt-1">
        {sub}
      </p>
    </div>
  )
}
