import { prisma } from "@/lib/prisma";
import { Shirt, DollarSign, Layers, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WardrobeList } from "@/components/wardrobe/wardrobe-list";
import { WardrobeFormDialog } from "@/components/wardrobe/wardrobe-form-dialog";

export default async function WardrobePage() {
  // 1. Buscar Roupas
  const items = await prisma.wardrobeItem.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // 2. Cálculos de Estatísticas (Server Side)
  const totalItems = items.length;
  
  // Soma do preço de todas as roupas
  const totalValue = items.reduce((acc, item) => {
    return acc + (item.price ? Number(item.price) : 0);
  }, 0);

  // Peças que estão lavando
  const laundryCount = items.filter(i => i.status === "LAUNDRY").length;

  // Peça mais usada (MVP do algoritmo de estilo)
  const mostWornItem = items.reduce((prev, current) => {
    return (prev.wearCount > current.wearCount) ? prev : current
  }, items[0]);

  // 3. Serializar para o Client Component
  const serializedItems = items.map(item => ({
    ...item,
    price: item.price ? Number(item.price) : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
    // Null safety
    imageUrl: item.imageUrl || null,
    brand: item.brand || null,
    size: item.size || null,
    color: item.color || null,
    season: item.season || null,
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <Shirt className="h-8 w-8 text-violet-600" /> 
                Closet Digital
            </h1>
            <p className="text-zinc-500 text-base mt-1">
                Gerencie seu estilo, custo por uso e onde estão suas roupas.
            </p>
        </div>
        
        <div className="flex gap-2">
            <WardrobeFormDialog mode="create" />
        </div>
      </div>

      {/* DASHBOARD DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-full text-violet-600"><Layers className="h-5 w-5" /></div>
                  <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Peças</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{totalItems}</h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600"><DollarSign className="h-5 w-5" /></div>
                  <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Valor Investido</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
                        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600"><Layers className="h-5 w-5" /></div>
                  <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Na Lavanderia</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{laundryCount}</h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0 shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-white/10"><Sparkles className="h-24 w-24" /></div>
              <CardContent className="p-5">
                  <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">Mais Usada</p>
                  <h3 className="text-lg font-black truncate mt-1 leading-tight">
                    {mostWornItem ? mostWornItem.name : "Nenhuma ainda"}
                  </h3>
                  <p className="text-xs text-violet-200/80 mt-1">
                    {mostWornItem ? `${mostWornItem.wearCount} vezes` : "Comece a registrar!"}
                  </p>
              </CardContent>
          </Card>
      </div>

      {/* LISTA DE ITENS */}
      <WardrobeList initialData={serializedItems} />

    </div>
  );
}