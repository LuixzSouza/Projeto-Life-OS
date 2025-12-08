import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BookOpen, CreditCard, DollarSign, Users } from "lucide-react";

export default async function DashboardPage() {
  // Busca real no banco de dados (para confirmar que está conectado)
  const userCount = await prisma.user.count();

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <div className="text-sm text-zinc-500">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Grid de Cards Principais (Widgets) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Widget 1: Financeiro (Placeholder) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 12.450,00</div>
            <p className="text-xs text-zinc-500">+20.1% em relação ao mês passado</p>
          </CardContent>
        </Card>

        {/* Widget 2: Estudos (Placeholder) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Estudadas</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24h 12m</div>
            <p className="text-xs text-zinc-500">Meta semanal: 60% concluída</p>
          </CardContent>
        </Card>

        {/* Widget 3: Projetos Ativos (Placeholder) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-zinc-500">2 prazos próximos</p>
          </CardContent>
        </Card>

        {/* Widget 4: Sistema (Dados Reais do DB) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-zinc-500">Usuários registrados (DB Online)</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Conteúdo Principal (Ex: Gráficos ou Listas Recentes) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Área Maior (Ex: Gráfico Financeiro) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-zinc-400 border-2 border-dashed rounded-md">
              Gráfico de Atividades será renderizado aqui
            </div>
          </CardContent>
        </Card>

        {/* Área Menor (Ex: Próximas Tarefas) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Próximas Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Item Fictício 1 */}
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Terminar API do Life OS</p>
                  <p className="text-sm text-zinc-500">Alta Prioridade</p>
                </div>
                <div className="ml-auto font-medium text-red-500">Hoje</div>
              </div>
              
              {/* Item Fictício 2 */}
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Treino de Pernas</p>
                  <p className="text-sm text-zinc-500">Saúde</p>
                </div>
                <div className="ml-auto font-medium text-zinc-500">18:00</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}