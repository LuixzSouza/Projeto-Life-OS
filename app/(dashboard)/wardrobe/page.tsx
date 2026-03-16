import { prisma } from "@/lib/prisma";
import { Shirt, DollarSign, Layers, Sparkles, Tag, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeList } from "@/components/wardrobe/wardrobe-list";
import { WardrobeFormDialog } from "@/components/wardrobe/wardrobe-form-dialog";
import { cn } from "@/lib/utils";

// --- 1. Definimos o Tipo Exato ---
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

// --- Componentes de UI Auxiliares ---
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: string, positive: boolean }; // 🟢 NOVO: Para mostrar métricas como "Boa Rotação"
}

function MetricCard({ label, value, icon: Icon, description, trend }: MetricCardProps) {
  return (
    <Card className="bg-card border-border/60 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group h-full">
      <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {label}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          )}
          {trend && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full flex shrink-0 ml-2",
              trend.positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
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
      "relative overflow-hidden border-0 shadow-lg group h-full",
      variant === "default" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
    )}>
      <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-32 w-32" />
      </div>
      
      <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            {variant === "default" ? <Sparkles className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
          </div>
          <h3 className="text-xl font-black leading-tight truncate pr-2">
            {value}
          </h3>
        </div>
        <p className="text-sm opacity-90 mt-4 font-medium bg-black/10 inline-block px-3 py-1 rounded-md backdrop-blur-sm w-fit">
          {subValue}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Página Principal ---
export default async function WardrobePage() {
  const items = await prisma.wardrobeItem.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // --- 🧠 INTELIGÊNCIA DO CLOSET (CÁLCULOS REAIS) ---
  const totalItems = items.length;
  
  // 1. Custo Total & Custo por Uso (Cost Per Wear)
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
  // Custo por uso médio: Quanto custa cada vez que ele veste uma roupa do armário?
  const averageCostPerWear = totalWearCount > 0 ? (totalValue / totalWearCount).toFixed(2) : "0.00";

  // 2. Taxa de Rotação (Peças usadas vs Peças paradas)
  const itemsWorn = items.filter(i => i.wearCount > 0).length;
  const rotationRate = totalItems > 0 ? Math.round((itemsWorn / totalItems) * 100) : 0;

  // 3. O Mais Usado vs O Encalhado
  const mostWornItem = items.length > 0 
    ? items.reduce((prev, current) => (prev.wearCount > current.wearCount) ? prev : current)
    : null;

  // Pega uma peça que custou caro (acima da média), nunca ou pouco usada (wearCount <= 1), e que não é recente (para não pegar compras de ontem)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const neglectedItems = items.filter(i => 
    i.wearCount <= 1 && 
    i.price && Number(i.price) >= averagePrice &&
    i.createdAt < thirtyDaysAgo &&
    i.status === "IN_CLOSET"
  );
  
  const forgottenItem = neglectedItems.length > 0 ? neglectedItems[0] : null;

  // Serialização
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
    <div className="min-h-screen bg-background pb-24">
      
      {/* HEADER */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-lg shadow-lg shadow-primary/25 text-primary-foreground">
                <Shirt className="h-6 w-6" />
              </div>
              Estilo & Acervo
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Descubra o valor real das suas roupas. Vista o que você ama, desapegue do que pesa.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <WardrobeFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">

        {/* 🟢 DASHBOARD DE INTELIGÊNCIA (O argumento para o amigo) */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          <MetricCard 
            label="Patrimônio em Roupas" 
            value={totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
            icon={DollarSign} 
            description={`${totalItems} peças no acervo`}
            trend={{ value: `Média R$ ${averagePrice.toFixed(0)}/peça`, positive: true }}
          />

          <MetricCard 
            label="Eficiência do Armário" 
            value={`R$ ${averageCostPerWear}`} 
            icon={RefreshCw} 
            description="Custo médio de cada 'look' (CPW)"
            trend={{ 
                value: rotationRate > 60 ? "Ótima rotação" : "Peças paradas", 
                positive: rotationRate > 60 
            }}
          />

          <HighlightCard 
            label="Sua Marca Registrada"
            value={mostWornItem?.name || "Nenhuma peça destacada"}
            subValue={mostWornItem ? `Usada ${mostWornItem.wearCount} vezes` : "Comece a registrar seus looks!"}
            icon={TrendingUp}
            variant="default"
          />

          {/* O Card do "Choque de Realidade" */}
          <HighlightCard 
            label="Sugestão de Desapego"
            value={forgottenItem ? forgottenItem.name : "Armário Limpo!"}
            subValue={forgottenItem ? `Cara e nunca usada. Venda?` : "Você usa tudo o que tem."}
            icon={Tag}
            variant={forgottenItem ? "alert" : "default"}
          />

        </section>

        {/* LISTA DE ITENS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <h2 className="text-xl font-semibold text-foreground">Seu Inventário</h2>
            </div>
          </div>

          <div className="bg-card/50 rounded-xl border border-border/60 shadow-sm backdrop-blur-[2px]">
             <WardrobeList initialData={serializedItems} />
          </div>
        </section>

      </main>
    </div>
  );
}