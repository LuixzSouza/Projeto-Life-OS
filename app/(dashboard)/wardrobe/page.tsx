import { prisma } from "@/lib/prisma";
import { Shirt, DollarSign, Tag, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeList } from "@/components/wardrobe/wardrobe-list";
import { WardrobeFormDialog } from "@/components/wardrobe/wardrobe-form-dialog";
import { cn } from "@/lib/utils";

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

// --- COMPONENTES DE UI AUXILIARES (Design Limpo) ---
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: string, positive: boolean }; 
}

function MetricCard({ label, value, icon: Icon, description, trend }: MetricCardProps) {
  return (
    <Card className="bg-card border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-muted text-muted-foreground shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
          {description && (
            <p className="text-xs font-medium text-muted-foreground truncate pr-2">{description}</p>
          )}
          {trend && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md flex shrink-0",
              trend.positive 
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
            )}>
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
  const items = await prisma.wardrobeItem.findMany({
    orderBy: { createdAt: 'desc' }
  });

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
    <div className="min-h-screen bg-background w-full pb-12">
      
      {/* HEADER LIMPO E SÓBRIO */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-6 md:px-8 py-6">
        <div className=" mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Closet & Acervo
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Gerencie suas peças, otimize seus looks e acompanhe o real custo por uso.
              </p>
            </div>
          </div>
          
          {/* Botão de Adição Rápida */}
          <div className="shrink-0 w-full md:w-auto flex">
            <WardrobeFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full px-6 md:px-8 py-8 space-y-8 animate-in fade-in duration-500">

        {/* 🟢 DASHBOARD DE INTELIGÊNCIA */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard 
            label="Patrimônio Estimado" 
            value={totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
            icon={DollarSign} 
            description={`${totalItems} peças no acervo`}
            trend={{ value: `Média R$ ${averagePrice.toFixed(0)}`, positive: true }}
          />

          <MetricCard 
            label="Eficiência de Uso (CPW)" 
            value={`R$ ${averageCostPerWear}`} 
            icon={RefreshCw} 
            description="Custo médio por cada uso"
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

      </main>
    </div>
  );
}