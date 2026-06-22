// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Shirt, DollarSign, Tag, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeList } from "@/components/wardrobe/wardrobe-list";
import { WardrobeFormDialog } from "@/components/wardrobe/wardrobe-form-dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { StatCard } from "@/components/ui/stat-card";

// --- TIPAGENS ---
type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";

interface SerializedWardrobeItem {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  price: number | null;
  wearCount: number;
  status: WardrobeStatus;
  lastWorn: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// --- COMPONENTE DE DESTAQUE (específico do Closet) ---
function HighlightCard({ label, value, subValue, icon: Icon, variant = "default" }: { label: string, value: string, subValue: string, icon: React.ElementType, variant?: "default" | "alert" }) {
  return (
    <Card className={cn(
      "relative overflow-hidden border border-border/40 shadow-sm group h-full",
      variant === "default" ? "bg-primary/5 border-primary/20" : "bg-rose-500/5 border-rose-500/20"
    )}>
      <div className={cn(
          "absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500",
          variant === "default" ? "text-primary" : "text-rose-500"
      )}>
        <Icon className="h-24 w-24" />
      </div>
      
      <CardContent className="p-5 relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className={cn("flex items-center gap-1.5 mb-3", variant === "default" ? "text-primary" : "text-rose-500")}>
            <Icon className="h-3.5 w-3.5" />
            <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
          </div>
          <h3 className="text-lg font-bold leading-tight line-clamp-2 text-foreground pr-4">
            {value}
          </h3>
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-4 pt-4 border-t border-border/40 line-clamp-1">
          {subValue}
        </p>
      </CardContent>
    </Card>
  );
}

// --- PÁGINA PRINCIPAL ---
export default async function WardrobePage() {
  const userId = await getCurrentUserId();
  // Queries independentes em paralelo (1 round-trip na nuvem em vez de 2).
  const [items, settings] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { userId: userId ?? "", deletedAt: null },
      orderBy: { createdAt: 'desc' }
    }),
    userId
      ? prisma.settings.findUnique({ where: { userId }, select: { currency: true } })
      : Promise.resolve(null),
  ]);

  // Moeda escolhida pelo usuário (Configurações > Regional)
  const currency = settings?.currency || "BRL";

  // --- 🧠 INTELIGÊNCIA DO CLOSET ---
  const totalItems = items.length;
  
  let totalValue = 0;
  let totalWearCount = 0;
  let itemsWithPrice = 0;

  items.forEach(item => {
    if (item.price) {
      totalValue += Number(item.price);
      itemsWithPrice++;
    }
    totalWearCount += item.wearCount;
  });

  const averagePrice = itemsWithPrice > 0 ? totalValue / itemsWithPrice : 0;
  const averageCostPerWear = totalWearCount > 0 ? (totalValue / totalWearCount).toFixed(2) : "0.00";

  const itemsWorn = items.filter(i => i.wearCount > 0).length;
  const rotationRate = totalItems > 0 ? Math.round((itemsWorn / totalItems) * 100) : 0;

  const mostWornItem = items.length > 0 
    ? items.reduce((prev, current) => (prev.wearCount > current.wearCount) ? prev : current)
    : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const neglectedItems = items.filter(i => 
    i.wearCount <= 1 && 
    i.price && Number(i.price) >= averagePrice &&
    i.createdAt < thirtyDaysAgo &&
    i.status === "IN_CLOSET"
  );
  
  const forgottenItem = neglectedItems.length > 0 ? neglectedItems[0] : null;

  // Serialização para o Client Component
  const serializedItems: SerializedWardrobeItem[] = items.map(item => ({
    ...item,
    price: item.price ? Number(item.price) : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
    imageUrl: item.imageUrl || null,
    brand: item.brand || null,
    size: item.size || null,
    color: item.color || null,
    season: item.season || null,
    status: (item.status as WardrobeStatus) || "IN_CLOSET" 
  }));

  return (
    <PageShell>
      <PageHeader
        icon={<Shirt className="h-6 w-6" />}
        title="Closet & Acervo"
        description="Gerencie suas peças, otimize seus looks e acompanhe o real custo por uso."
        actions={<WardrobeFormDialog mode="create" />}
      />

      <PageContainer className="space-y-8">

        {/* 🟢 DASHBOARD DE INTELIGÊNCIA */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            label="Patrimônio Estimado"
            value={formatCurrency(totalValue, { currency, maximumFractionDigits: 0 })}
            icon={DollarSign}
            iconClassName="bg-muted text-muted-foreground"
            hint={`${totalItems} peças no acervo`}
            trend={{ value: `Média R$ ${averagePrice.toFixed(0)}`, positive: true }}
          />

          <StatCard
            label="Eficiência de Uso (CPW)"
            value={`R$ ${averageCostPerWear}`}
            icon={RefreshCw}
            iconClassName="bg-muted text-muted-foreground"
            hint="Custo médio por cada uso"
            trend={{
                value: rotationRate > 60 ? `${rotationRate}% em rotação` : `${rotationRate}% estagnado`,
                positive: rotationRate > 60
            }}
          />

          <HighlightCard 
            label="Peça Favorita"
            value={mostWornItem?.name || "Nenhuma peça"}
            subValue={mostWornItem ? `Usada ${mostWornItem.wearCount} vezes` : "Comece a registrar seus looks!"}
            icon={TrendingUp}
            variant="default"
          />

          <HighlightCard 
            label="Dinheiro Parado"
            value={forgottenItem ? forgottenItem.name : "Acervo Limpo!"}
            subValue={forgottenItem ? `Cara e não usada. Vender?` : "Você usa tudo o que tem."}
            icon={Tag}
            variant={forgottenItem ? "alert" : "default"}
          />
        </section>

        {/* LISTA DE ITENS */}
        <section className="space-y-4">
          <WardrobeList initialData={serializedItems} />
        </section>

      </PageContainer>
    </PageShell>
  );
}