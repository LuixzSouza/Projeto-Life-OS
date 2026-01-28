import { prisma } from "@/lib/prisma"
import { Metadata } from "next"
import { BusinessView } from "@/components/business/business-view" // Ajuste o caminho se necessário

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Users, AlertCircle, TrendingUp, Briefcase } from "lucide-react"

export const metadata: Metadata = {
  title: "Gestão de Negócios | Life OS",
}

export default async function BusinessPage() {
  // 1. Buscamos os dados brutos do banco (Contém Decimals)
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

  // 2. CORREÇÃO CRÍTICA: Serialização
  // Convertemos os objetos Decimal do Prisma para number (JavaScript padrão)
  // para que o Next.js consiga enviar para o componente Client-Side.
  const clients = rawClients.map(client => ({
    ...client,
    billings: client.billings.map(billing => ({
      ...billing,
      // Converte Decimal para number
      totalValue: Number(billing.totalValue), 
      invoices: billing.invoices.map(invoice => ({
        ...invoice,
        // Converte Decimal para number
        value: Number(invoice.value),
        // Garante que datas sejam objetos Date (Prisma já faz, mas garante segurança)
        dueDate: new Date(invoice.dueDate), 
      }))
    }))
  }))

  // 3. Lógica de KPIs (Usamos os dados já convertidos para facilitar)
  const today = new Date()
  today.setHours(0,0,0,0) // Zera hora para comparar apenas datas
  
  // Total a Receber (Geral)
  const totalReceivables = clients.reduce((acc, client) => {
    const clientDebt = client.billings.reduce((bAcc, billing) => {
      const pendingInvoices = billing.invoices
        .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
        .reduce((iAcc, inv) => iAcc + inv.value, 0) // Já é number
      return bAcc + pendingInvoices
    }, 0)
    return acc + clientDebt
  }, 0)

  // Total em Atraso (Urgente)
  const totalOverdue = clients.reduce((acc, client) => {
    const clientOverdue = client.billings.reduce((bAcc, billing) => {
      const lateInvoices = billing.invoices
        .filter(inv => (inv.status === 'PENDING' && new Date(inv.dueDate) < today) || inv.status === 'OVERDUE')
        .reduce((iAcc, inv) => iAcc + inv.value, 0)
      return bAcc + lateInvoices
    }, 0)
    return acc + clientOverdue
  }, 0)

  // Total de Contratos Ativos
  const activeContracts = clients.reduce((acc, client) => {
    return acc + client.billings.filter(b => b.status === 'ACTIVE').length
  }, 0)

  // Formatador de Moeda
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" /> Negócios & Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie contratos, emita cobranças e acompanhe o fluxo de caixa dos seus projetos.
          </p>
        </div>
      </div>

      {/* --- KPI CARDS (MÉTRICAS) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Total a Receber */}
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Receber
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalReceivables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todas faturas abertas
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Em Atraso */}
        <Card className={`shadow-sm ${totalOverdue > 0 ? "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Atraso / Vencido
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${totalOverdue > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOverdue > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {formatCurrency(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Contratos Ativos */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projetos em andamento
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Base de Clientes */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Base de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- ÁREA PRINCIPAL (INTERATIVA) --- */}
      {/* Agora passamos 'clients' que já foi convertido, o erro de tipo vai sumir */}
      <BusinessView initialClients={clients} />
    </div>
  )
}