// src/app/dashboard/_components/productivity-section.tsx
import { getProductivityData } from "@/lib/services/dashboard.service";
import { calculateProductivityScore, calculateProductivityTrend } from "@/lib/utils/dashboard.utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { StudyChart } from "@/components/dashboard/client-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, CheckCircle2, Circle, BookOpen, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ==========================================
// 1. COMPONENTES MENORES (Reutilizáveis)
// ==========================================
type KpiColor = "purple" | "indigo" | "slate" | "fuchsia";

const kpiStyles: Record<KpiColor, { border: string; icon: string; bg: string }> = {
  purple: { border: "border-l-purple-500", icon: "text-purple-500", bg: "bg-purple-50" },
  indigo: { border: "border-l-indigo-500", icon: "text-indigo-500", bg: "bg-indigo-50" },
  slate: { border: "border-l-slate-400", icon: "text-slate-500", bg: "bg-slate-50" },
  fuchsia: { border: "border-l-fuchsia-500", icon: "text-fuchsia-500", bg: "bg-fuchsia-50" },
};

interface ProductivityKpiCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon: React.ElementType; // Correção: Substitui o 'any' exigido pelo ESLint
  color: KpiColor;
  children?: React.ReactNode;
}

function ProductivityKpiCard({ 
  title, value, subtitle, icon: Icon, color, children 
}: ProductivityKpiCardProps) {
  const styles = kpiStyles[color] || kpiStyles.slate;
  
  return (
    <Card className={`border-l-4 ${styles.border} shadow-sm transition-all hover:shadow-md h-full flex flex-col`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-full ${styles.bg}`}>
          <Icon className={`h-4 w-4 ${styles.icon}`} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

// Trend Indicator Component
function TrendIndicator({ direction, text }: { direction: 'up' | 'down' | 'flat', text: string }) {
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const colorClass = isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{text}</span>
    </div>
  );
}

// ==========================================
// 2. SEÇÃO PRINCIPAL
// ==========================================
export async function ProductivitySection({ userId }: { userId: string }) {
  // Carregamento Seguro
  const data = await getProductivityData(userId).catch(() => null);

  if (!data) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        Erro ao carregar dados de produtividade. Tente novamente mais tarde.
      </Card>
    );
  }

  // Correção: Agora os dados já vêm limpos e calculados do Service
  const studyData = data.orderedStudyData || [];
  const totalStudyMinutes = data.totalStudyMinutes || 0;
  const totalStudyHours = data.totalStudyHours || 0;
  
  // Note: pendingTasks e completedTasks assumem que "Tasks" compartilham o mesmo modelo no banco.
  const productivityScore = calculateProductivityScore(data.completedTasks, totalStudyMinutes);
  
  // Correção: Passando o segundo argumento obrigatório da assinatura da função
  const trend = calculateProductivityTrend(productivityScore, data.previousPeriodScore); 

  // Estados
  const hasStudyData = studyData.length > 0;
  const hasProjects = data.activeProjects && data.activeProjects.length > 0;

  return (
    <div className="space-y-6">
      
      {/* KPIs com Hierarquia Visual Melhorada */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Score com Variação e Barra Progressiva */}
        <ProductivityKpiCard 
          title="Score de Produtividade" 
          value={<>{productivityScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span></>} 
          icon={Trophy} 
          color="purple"
        >
          <TrendIndicator direction={trend.direction} text={trend.text} />
          <Progress value={productivityScore} className="h-1.5 mt-3 bg-purple-100 [&>div]:bg-purple-500" />
        </ProductivityKpiCard>

        {/* Tarefas Padronizadas */}
        <ProductivityKpiCard 
          title="Tarefas Concluídas" 
          value={data.completedTasks} 
          subtitle="Total histórico finalizado"
          icon={CheckCircle2} 
          color="indigo" 
        />
        
        <ProductivityKpiCard 
          title="Tarefas Pendentes" 
          value={data.pendingTasks} 
          subtitle="Itens aguardando ação"
          icon={Circle} 
          color="slate" 
        />

        {/* Tempo de Estudo Contextualizado */}
        <ProductivityKpiCard 
          title="Tempo de Estudo" 
          value={`${totalStudyHours}h ${(totalStudyMinutes % 60).toString().padStart(2, '0')}m`} 
          subtitle="Foco acumulado geral"
          icon={Clock} 
          color="fuchsia" 
        />
      </div>

      {/* Grid Principal: Ajustado para quebrar melhor em telas médias (md:grid-cols-1) */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        
        {/* Bloco Primário: Gráfico (Foco Principal) */}
        <div className="min-w-0 lg:col-span-7 flex flex-col">
          <Card className="shadow-sm flex-1 flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" /> Foco por Matéria
              </CardTitle>
              <CardDescription>Distribuição do seu tempo de estudo focado</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {!hasStudyData ? (
                <EmptyState 
                  icon={BookOpen} 
                  title="Nenhum estudo registrado" 
                  description="Inicie uma sessão de foco ou associe matérias aos seus estudos para visualizar seu progresso." 
                />
              ) : (
                <StudyChart data={studyData} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bloco Secundário: Projetos (Altura Consistente) */}
        <div className="min-w-0 lg:col-span-5 flex flex-col">
          {!hasProjects ? (
            <Card className="shadow-sm flex-1 flex flex-col justify-center border-dashed">
              <CardContent className="pt-6">
                <EmptyState 
                  icon={Trophy} 
                  title="Sem projetos ativos" 
                  description="Crie um novo projeto para gerenciar metas maiores e acompanhar seu progresso." 
                />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col">
              <ProjectsCard projects={data.activeProjects} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 3. SKELETON ESPECÍFICO
// ==========================================
export function ProductivitySectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}