import { prisma } from "@/lib/prisma"
import { Metadata } from "next"
import { BusinessView } from "@/components/business/business-view" 
import { cn, formatCurrency as formatCurrencyUtil } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Users, AlertCircle, TrendingUp, Briefcase, Landmark } from "lucide-react"
import { getCurrentUserId } from "@/lib/auth"
import { syncRecurringChargeInvoices } from "@/lib/notifications"
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell"
import { AskAiButton } from "@/components/ai/ask-ai-button"

export const metadata: Metadata = {
  title: "Gestão de Negócios | Life OS",
}

export default async function BusinessPage() {
  // 1. Buscamos os dados brutos do banco
  const userId = await getCurrentUserId()

  // Materializa as faturas das cobranças recorrentes vencidas/do mês ao abrir a página
  // (best-effort, idempotente) — assim os contratos "simplesmente funcionam" sem clicar no sino.
  if (userId) await syncRecurringChargeInvoices(userId).catch(() => {})

  const rawClients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    include: {
      friend: {
        select: { id: true, name: true, imageUrl: true, phone: true, company: true, jobTitle: true }
      },
      billings: {
        include: {
          invoices: {
            orderBy: { dueDate: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 2. Serialização Segura para Client Components
  const clients = rawClients.map(client => ({
    ...client,
    billings: client.billings.map(billing => ({
      ...billing,
      totalValue: Number(billing.totalValue),
      lastRemindedAt: billing.lastRemindedAt ? new Date(billing.lastRemindedAt) : null,
      invoices: billing.invoices.map(invoice => ({
        ...invoice,
        value: Number(invoice.value),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null // Adicionado para segurança caso vá usar no front
      }))
    }))
  }))

  // Conexões (para vincular um contato ao cliente). As contas ficam na página
  // de detalhe (/business/[id]), onde acontecem os recebimentos.
  const friends = userId
    ? await prisma.friend.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, imageUrl: true, company: true },
        orderBy: { name: 'asc' },
      })
    : []

  const today = new Date()
  today.setHours(0,0,0,0)
  
  // 3. Cálculos (KPIs)
  
  // NOVO: Total Ganho (Soma de tudo que está PAGO)
  const totalEarned = clients.reduce((acc, client) => {
    return acc + client.billings.reduce((bAcc, billing) => {
      return bAcc + billing.invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((iAcc, inv) => iAcc + inv.value, 0)
    }, 0)
  }, 0)

  // Total a Receber (PENDENTES que ainda NÃO venceram — não conta os atrasados,
  // que aparecem separadamente em "Em Atraso" para evitar dupla contagem).
  const totalReceivables = clients.reduce((acc, client) => {
    return acc + client.billings.reduce((bAcc, billing) => {
      return bAcc + billing.invoices
        .filter(inv => inv.status === 'PENDING' && new Date(inv.dueDate) >= today)
        .reduce((iAcc, inv) => iAcc + inv.value, 0)
    }, 0)
  }, 0)

  // Total Atrasado (Soma de PENDING vencidos hoje ou antes, ou marcados como OVERDUE)
  const totalOverdue = clients.reduce((acc, client) => {
    return acc + client.billings.reduce((bAcc, billing) => {
      return bAcc + billing.invoices
        .filter(inv => (inv.status === 'PENDING' && new Date(inv.dueDate) < today) || inv.status === 'OVERDUE')
        .reduce((iAcc, inv) => iAcc + inv.value, 0)
    }, 0)
  }, 0)

  // Total de Contratos em andamento
  const activeContracts = clients.reduce((acc, client) => {
    return acc + client.billings.filter(b => b.status === 'ACTIVE').length
  }, 0)

  // Configurações do usuário (moeda + dados de cobrança), em uma única query.
  const userSettings = userId
    ? await prisma.settings.findUnique({
        where: { userId },
        select: { currency: true, pixKey: true, businessName: true },
      })
    : null
  const currency = userSettings?.currency || "BRL"
  const formatCurrency = (val: number) => formatCurrencyUtil(val, { currency })

  return (
    <PageShell className="bg-background/50">
      <PageHeader
        icon={<Briefcase className="h-6 w-6" />}
        title="Negócios & Clientes"
        description="Gestão financeira de clientes, cobranças e contratos."
        actions={<AskAiButton q="Como estão meus clientes? Alguma fatura vencida ou cobrança pendente?" label="Analisar com IA" />}
      />

      <PageContainer className="space-y-8">

        {/* KPI CARDS (CLEAN UI) */}
        {/* Ajustado para 5 colunas no desktop para acomodar a nova métrica */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          
          {/* 1. O que já entrou no bolso */}
          <Card className="shadow-sm border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Recebido</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground/70" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-foreground">
                {formatCurrency(totalEarned)}
              </div>
            </CardContent>
          </Card>

          {/* 2. O que tem pra receber (Saudável) */}
          <Card className="shadow-sm border-transparent bg-emerald-50/50 dark:bg-emerald-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">A Receber</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500 opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totalReceivables)}
              </div>
            </CardContent>
          </Card>

          {/* 3. O que deu ruim (Atenção) */}
          <Card className={cn("shadow-sm border-transparent transition-colors", totalOverdue > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn("text-xs font-medium", totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>Em Atraso</CardTitle>
              <AlertCircle className={cn("h-4 w-4 opacity-70", totalOverdue > 0 ? "text-red-500" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-xl lg:text-2xl font-bold", totalOverdue > 0 ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>
                {formatCurrency(totalOverdue)}
              </div>
            </CardContent>
          </Card>

          {/* 4. Operacional */}
          <Card className="shadow-sm border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Contratos Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground/70" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">{activeContracts}</div>
            </CardContent>
          </Card>

          {/* 5. Clientes */}
          <Card className="shadow-sm border-border/50 bg-card hidden md:block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Base de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground/70" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* ÁREA PRINCIPAL INTERATIVA */}
        <BusinessView
          initialClients={clients}
          friends={friends}
          pixKey={userSettings?.pixKey || ""}
          businessName={userSettings?.businessName || ""}
        />
      </PageContainer>
    </PageShell>
  )
}