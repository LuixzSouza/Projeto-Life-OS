import { prisma } from "@/lib/prisma";
import { Shirt, DollarSign, Layers, Sparkles, Tag, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeList } from "@/components/wardrobe/wardrobe-list";
import { WardrobeFormDialog } from "@/components/wardrobe/wardrobe-form-dialog";
import { cn } from "@/lib/utils";

// --- 1. Definimos o Tipo Exato ---
type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";

// --- 2. Atualizamos a Interface para usar o Tipo Exato ---
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
  status: WardrobeStatus; // ✅ Correção: Agora não é mais string genérica
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
}

function MetricCard({ label, value, icon: Icon, description }: MetricCardProps) {
  return (
    <Card className="bg-card border-border/60 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group">
      <CardContent className="p-6 flex items-center gap-5">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HighlightCard({ label, value, subValue, icon: Icon }: { label: string, value: string, subValue: string, icon: React.ElementType }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg bg-primary text-primary-foreground group">
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 text-primary-foreground/10 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-32 w-32" />
      </div>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        </div>
        <h3 className="text-xl font-black leading-tight truncate pr-2">
          {value}
        </h3>
        <p className="text-sm opacity-80 mt-1 font-medium bg-primary-foreground/10 inline-block px-2 py-0.5 rounded-md backdrop-blur-sm">
          {subValue}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Página Principal ---

export default async function WardrobePage() {
  // 1. Buscar Roupas
  const items = await prisma.wardrobeItem.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // 2. Cálculos de Estatísticas (Server Side)
  const totalItems = items.length;
  
  const totalValue = items.reduce((acc, item) => {
    return acc + (item.price ? Number(item.price) : 0);
  }, 0);

  const laundryCount = items.filter(i => i.status === "LAUNDRY").length;

  // Lógica segura para encontrar o item mais usado
  const mostWornItem = items.length > 0 
    ? items.reduce((prev, current) => (prev.wearCount > current.wearCount) ? prev : current)
    : null;

  // 3. Serializar para o Client Component (Tipagem Segura)
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
    // ✅ Correção: Type Assertion seguro. 
    // Assumimos que o banco retorna strings válidas que batem com nosso tipo.
    status: (item.status as WardrobeStatus) || "IN_CLOSET" 
  }));

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* HEADER VISUAL */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-lg shadow-lg shadow-primary/25 text-primary-foreground">
                <Shirt className="h-6 w-6" />
              </div>
              Closet Digital
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Gerencie seu inventário de estilo, monitore custos e organize seu dia a dia.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <WardrobeFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">

        {/* DASHBOARD DE MÉTRICAS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            label="Acervo Total" 
            value={totalItems} 
            icon={Layers} 
            description="Peças cadastradas"
          />

          <MetricCard 
            label="Valor Investido" 
            value={totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
            icon={DollarSign} 
            description="Patrimônio em vestuário"
          />

          <MetricCard 
            label="Na Lavanderia" 
            value={laundryCount} 
            icon={Tag} 
            description="Peças indisponíveis"
          />

          <HighlightCard 
            label="Peça Favorita"
            value={mostWornItem?.name || "Nenhuma ainda"}
            subValue={mostWornItem ? `${mostWornItem.wearCount} utilizações` : "Comece a usar!"}
            icon={TrendingUp}
          />
        </section>

        {/* LISTA DE ITENS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <h2 className="text-xl font-semibold text-foreground">Inventário</h2>
            </div>
          </div>

          <div className="bg-card/50 rounded-xl border border-border/60 shadow-sm backdrop-blur-[2px]">
             {/* Agora os tipos batem perfeitamente */}
             <WardrobeList initialData={serializedItems} />
          </div>
        </section>

      </main>
    </div>
  );
}