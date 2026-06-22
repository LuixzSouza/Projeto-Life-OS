// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { LockKeyhole, ShieldCheck, ShieldAlert, Repeat2, Activity } from "lucide-react"
import { AccessView } from "@/components/access/access-view"
import { getCurrentUserId } from "@/lib/auth"
import { getVaultSecurityAudit } from "./actions"
import { cn } from "@/lib/utils"
import { Metadata } from "next"
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Cofre de Senhas | Life OS",
}

export default async function AccessPage() {
  // 1. Data Fetching
  // REMOVI O 'select'. Agora ele busca tudo (incluindo notes, userId, createdAt)
  // para satisfazer a tipagem do AccessItem e permitir a busca por notas.
  const userId = await getCurrentUserId()
  // Itens do cofre + auditoria de segurança são independentes — paralelos.
  const [allItems, audit] = await Promise.all([
    prisma.accessItem.findMany({
      where: { userId },
      orderBy: { title: "asc" },
    }),
    getVaultSecurityAudit(),
  ])
  const { stats } = audit
  const healthColor =
    stats.healthScore >= 75 ? "text-emerald-500"
    : stats.healthScore >= 45 ? "text-amber-500"
    : "text-rose-500"
  const healthBar =
    stats.healthScore >= 75 ? "bg-emerald-500"
    : stats.healthScore >= 45 ? "bg-amber-500"
    : "bg-rose-500"

  return (
    <PageShell>
      <PageHeader
        icon={<LockKeyhole className="h-6 w-6" />}
        title="Cofre de Acessos"
        description="Gerencie credenciais pessoais e corporativas em um único lugar. Seus dados nunca saem do seu dispositivo sem criptografia."
        actions={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            {/* Saúde geral (score) */}
            <div className="col-span-2 min-w-[160px] rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:col-span-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Activity className="h-3 w-3" /> Saúde
                </span>
                <span className={cn("text-lg font-black leading-none", healthColor)}>{stats.healthScore}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all duration-700", healthBar)} style={{ width: `${stats.healthScore}%` }} />
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center shadow-sm">
              <span className="block text-2xl font-bold leading-none text-foreground">{allItems.length}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Itens</span>
            </div>

            {/* Senhas frágeis */}
            <div className={cn("rounded-xl border p-4 text-center shadow-sm", stats.weak > 0 ? "border-rose-500/30 bg-rose-500/5" : "border-border/60 bg-card")}>
              <span className={cn("flex items-center justify-center gap-1 text-2xl font-bold leading-none", stats.weak > 0 ? "text-rose-500" : "text-foreground")}>
                {stats.weak > 0 && <ShieldAlert className="h-4 w-4" />}{stats.weak}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Frágeis</span>
            </div>

            {/* Senhas reutilizadas */}
            <div className={cn("rounded-xl border p-4 text-center shadow-sm", stats.reused > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-card")}>
              <span className={cn("flex items-center justify-center gap-1 text-2xl font-bold leading-none", stats.reused > 0 ? "text-amber-500" : "text-foreground")}>
                {stats.reused > 0 && <Repeat2 className="h-4 w-4" />}{stats.reused}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Repetidas</span>
            </div>
          </div>
        }
      >
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3 w-3" /> Ambiente Seguro & Criptografado
        </div>
      </PageHeader>

      <PageContainer>
        <AccessView initialItems={allItems} audit={audit} />
      </PageContainer>
    </PageShell>
  )
}