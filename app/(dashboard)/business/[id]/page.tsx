// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Briefcase } from "lucide-react"
import { getCurrentUserId } from "@/lib/auth"
import { syncRecurringChargeInvoices } from "@/lib/notifications"
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell"
import { ClientDetailView } from "@/components/business/client-detail-view"

export const metadata: Metadata = {
  title: "Detalhes do Cliente | Life OS",
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getCurrentUserId()
  if (!userId) notFound()

  // Mantém as faturas das cobranças recorrentes em dia (best-effort, idempotente).
  await syncRecurringChargeInvoices(userId).catch(() => {})

  // Cliente, contas, conexões e configurações são independentes — em paralelo
  // (4 round-trips na nuvem viram 1). O notFound checa rawClient logo depois;
  // o custo das outras 3 num 404 (raro) compensa a latência no caminho comum.
  const [rawClient, accounts, friends, userSettings] = await Promise.all([
    prisma.client.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        friend: {
          select: { id: true, name: true, imageUrl: true, phone: true, company: true, jobTitle: true },
        },
        billings: {
          include: { invoices: { orderBy: { dueDate: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, isConnected: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.friend.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, imageUrl: true, company: true },
      orderBy: { name: 'asc' },
    }),
    prisma.settings.findUnique({
      where: { userId },
      select: { pixKey: true, businessName: true },
    }),
  ])

  if (!rawClient) notFound()

  // Serialização segura para Client Components (Decimal -> number, datas).
  const client = {
    ...rawClient,
    billings: rawClient.billings.map(billing => ({
      ...billing,
      totalValue: Number(billing.totalValue),
      lastRemindedAt: billing.lastRemindedAt ? new Date(billing.lastRemindedAt) : null,
      invoices: billing.invoices.map(invoice => ({
        ...invoice,
        value: Number(invoice.value),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
      })),
    })),
  }

  return (
    <PageShell className="bg-background/50">
      <PageHeader
        icon={<Briefcase className="h-6 w-6" />}
        title={client.name}
        description={client.company || "Detalhes do cliente, contratos e faturas."}
      />
      <PageContainer className="space-y-8">
        <ClientDetailView
          client={client}
          accounts={accounts}
          friends={friends}
          pixKey={userSettings?.pixKey || ""}
          businessName={userSettings?.businessName || ""}
        />
      </PageContainer>
    </PageShell>
  )
}
