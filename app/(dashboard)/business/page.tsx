import { prisma } from "@/lib/prisma"
import { Metadata } from "next"
import { BusinessView } from "@/components/business/business-view" 
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Users, AlertCircle, TrendingUp, Briefcase, Landmark } from "lucide-react"

export const metadata: Metadata = {
  title: "Gestão de Negócios | Life OS",
}

export default async function BusinessPage() {
  // 1. Buscamos os dados brutos do banco
  const rawClients = await prisma.client.findMany({
    include: {
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
      invoices: billing.invoices.map(invoice => ({
        ...invoice,
        value: Number(invoice.value),
        dueDate: new Date(invoice.dueDate), 
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null // Adicionado para segurança caso vá usar no front
      }))
    }))
  }))

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

  // Total Pendente (Soma de tudo que ainda vai vencer ou não foi pago, ignorando cancelados)
  const totalReceivables = clients.reduce((acc, client) => {
    return acc + client.billings.reduce((bAcc, billing) => {
      return bAcc + billing.invoices
        .filter(inv => inv.status === 'PENDING')
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

  // Utilitário de formatação
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="min-h-screen bg-background/50 animate-in fade-in duration-500">
      
      {/* HEADER MINIMALISTA */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded flex items-center justify-center bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">Negócios & Clientes</span>
            <span className="text-[10px] text-muted-foreground">Gestão Financeira</span>
          </div>
        </div>
      </header>

      <main className="p-6 md:p-8 mx-auto space-y-8">
        
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
        <BusinessView initialClients={clients} />
      </main>
    </div>
  )
}