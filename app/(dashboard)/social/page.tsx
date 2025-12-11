import { prisma } from "@/lib/prisma";
import { Users, Star, Cake, Heart } from "lucide-react";
import { FriendList } from "@/components/social/friend-list";
// ✅ IMPORT CORRIGIDO (Use o novo componente genérico)
import { FriendFormDialog } from "@/components/social/add-friend-dialog"; 
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SocialPage() {
  // 1. Buscar todos os amigos
  const friends = await prisma.friend.findMany({
    orderBy: { name: 'asc' }
  });

  // 2. Cálculos de Estatísticas
  const currentMonth = new Date().getMonth();
  
  const totalFriends = friends.length;
  // Filtra por proximidade (FAMILY ou CLOSE)
  const closeFriends = friends.filter(f => f.proximity === 'CLOSE' || f.proximity === 'FAMILY').length;
  
  // Filtra aniversariantes do mês atual
  const birthdaysThisMonth = friends.filter(f => {
    if (!f.birthday) return false;
    return f.birthday.getMonth() === currentMonth;
  }).length;

  // 3. Serializar dados (Datas para String e NULL safety)
  const serializedFriends = friends.map(f => ({
    ...f,
    birthday: f.birthday ? f.birthday.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    imageUrl: f.imageUrl || null,
    giftIdeas: f.giftIdeas || null,
  }));

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black p-6 md:p-8 space-y-8 pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <Users className="h-8 w-8 text-indigo-600" /> 
                Gestão de Conexões
            </h1>
            <p className="text-zinc-500 text-base mt-1">
                Seu CRM pessoal. Gerencie relacionamentos e nunca esqueça detalhes importantes.
            </p>
        </div>
        
        <div className="flex gap-2">
            {/* ✅ USO CORRIGIDO DO MODAL */}
            <FriendFormDialog mode="create" />
        </div>
      </div>

      {/* --- DASHBOARD DE INSIGHTS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                      <Users className="h-6 w-6" />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total de Contatos</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{totalFriends}</h3>
                  </div>
              </CardContent>
          </Card>

          {/* Card 2: Círculo Íntimo */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-600">
                      <Heart className="h-6 w-6" />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Círculo Íntimo</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{closeFriends}</h3>
                  </div>
              </CardContent>
          </Card>

          {/* Card 3: Aniversariantes */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-full text-pink-500">
                      <Cake className="h-6 w-6" />
                  </div>
                  <div>
                      <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Aniversários (Mês)</p>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{birthdaysThisMonth}</h3>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* --- LISTA E FILTROS --- */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Sua Rede</h2>
          </div>
          
          <FriendList initialData={serializedFriends} />
      </div>

    </div>
  );
}