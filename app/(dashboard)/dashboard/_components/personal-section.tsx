// src/app/dashboard/_components/personal-section.tsx
import { getPersonalData } from "@/lib/services/dashboard.service";
import { processUpcomingBirthdays } from "@/lib/utils/dashboard.utils";
import { formatNextEvent } from "@/lib/utils/agenda.utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BirthdaysCard } from "@/components/dashboard/birthdays-card";
import { NowPlayingCard } from "@/components/dashboard/now-playing-card";
import { SystemModules } from "@/components/dashboard/system-modules";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Droplets, Utensils, MessageSquare, CalendarCheck, PlayCircle } from "lucide-react";

// ==========================================
// 1. COMPONENTES MENORES (Reutilizáveis e Compactos)
// ==========================================
type KpiColor = "rose" | "cyan" | "orange" | "pink" | "slate";

const kpiStyles: Record<KpiColor, { border: string; icon: string; bg: string }> = {
  rose: { border: "border-l-rose-500", icon: "text-rose-500", bg: "bg-rose-50" },
  cyan: { border: "border-l-cyan-500", icon: "text-cyan-500", bg: "bg-cyan-50" },
  orange: { border: "border-l-orange-500", icon: "text-orange-500", bg: "bg-orange-50" },
  pink: { border: "border-l-pink-500", icon: "text-pink-500", bg: "bg-pink-50" },
  slate: { border: "border-l-slate-400", icon: "text-slate-500", bg: "bg-slate-50" },
};

interface PersonalKpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  highlight?: string;
  icon: React.ElementType; 
  color: KpiColor;
}

function PersonalKpiCard({ title, value, subtitle, highlight, icon: Icon, color }: PersonalKpiCardProps) {
  const styles = kpiStyles[color] || kpiStyles.slate;
  
  return (
    <Card className={`border-l-4 ${styles.border} shadow-sm transition-all hover:shadow-md h-full flex flex-col`}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 rounded-md ${styles.bg}`}>
          <Icon className={`h-4 w-4 ${styles.icon}`} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-end">
        <div className="text-xl sm:text-2xl font-bold tracking-tight truncate" title={typeof value === 'string' ? value : undefined}>
          {value}
        </div>
        <div className="flex items-center justify-between mt-1">
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          {highlight && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles.bg} ${styles.icon}`}>{highlight}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// 2. SEÇÃO PRINCIPAL
// ==========================================
export async function PersonalSection({ userId }: { userId: string }) {
  const data = await getPersonalData(userId).catch(() => null);

  if (!data) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        Erro ao carregar dados pessoais e de saúde.
      </Card>
    );
  }

  const upcomingBirthdays = processUpcomingBirthdays(data.friends || []);

  // O evento do Prisma é estruturalmente compatível com PrismaEvent (sem casts).
  const nextEvent = formatNextEvent(data.nextEvent);

  const waterToday = data.waterStats?._sum?.value || 0;
  const calsToday = data.mealStats?._sum?.calories || 0;
  const aiMessagesCount = data.aiMessages || 0;

  // Contagem de peças favoritas vinda direto do serviço.
  const favoriteClothesCount = data.favoriteClothesCount || 0;

  const hasMedia = Array.isArray(data.activeMedia) && data.activeMedia.length > 0;
  
  return (
    <div className="space-y-6">
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <PersonalKpiCard 
          title="Próximo Evento" 
          value={nextEvent.title} 
          subtitle={nextEvent.time}
          highlight={nextEvent.relative}
          icon={nextEvent.isEmpty ? CalendarCheck : Calendar} 
          color={nextEvent.isEmpty ? "slate" : "rose"} 
        />

        <PersonalKpiCard 
          title="Hidratação (Hoje)" 
          value={<>{waterToday} <span className="text-sm font-normal text-muted-foreground">ml</span></>} 
          subtitle="Meta diária em progresso"
          icon={Droplets} 
          color="cyan" 
        />

        <PersonalKpiCard 
          title="Calorias Ingeridas" 
          value={<>{calsToday} <span className="text-sm font-normal text-muted-foreground">kcal</span></>} 
          subtitle="Consumo registrado hoje"
          icon={Utensils} 
          color="orange" 
        />

        <PersonalKpiCard 
          title="Interações com IA" 
          value={aiMessagesCount} 
          subtitle="Mensagens enviadas"
          icon={MessageSquare} 
          color="pink" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`transition-all ${hasMedia ? "ring-1 ring-purple-500/20 rounded-xl shadow-sm" : ""}`}>
            {!hasMedia ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="py-8">
                  <EmptyState 
                    icon={PlayCircle} 
                    title="Nenhuma mídia em progresso" 
                    description="Filmes, séries ou livros que você começar a acompanhar aparecerão aqui." 
                  />
                </CardContent>
              </Card>
            ) : (
              <NowPlayingCard media={data.activeMedia} />
            )}
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-border flex-1"></div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos do Sistema</span>
            <div className="h-px bg-border flex-1"></div>
          </div>
          
          <SystemModules
            calsToday={calsToday}
            waterToday={waterToday}
            aiMessagesCount={aiMessagesCount}
            favoriteClothesCount={favoriteClothesCount} // CORREÇÃO: Propriedade adicionada
            recentLinks={data.recentLinks || []} 
          />
        </div>

        <div className="lg:col-span-4 sticky top-24">
          <BirthdaysCard birthdays={upcomingBirthdays} />
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 3. SKELETON ESPECÍFICO
// ==========================================
export function PersonalSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="py-2"><Skeleton className="h-4 w-32 mx-auto" /></div>
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}