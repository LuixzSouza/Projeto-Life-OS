import { prisma } from "@/lib/prisma";
import { Users, Star, Cake, Heart, TrendingUp, Sparkles } from "lucide-react";
import { FriendList } from "@/components/social/friend-list";
import { FriendFormDialog } from "@/components/social/add-friend-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}

// --- Componente Local: Card de Estatística (Enterprise Design) ---
function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-card border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-md">
      {/* Background Glow Effect on Hover */}
      <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
      
      <CardContent className="p-6 relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {title}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground pt-1">{description}</p>
          )}
        </div>
        
        <div className="p-3 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Página Principal ---
export default async function SocialPage() {
  // 1. Data Fetching (Mantendo lógica original)
  const friends = await prisma.friend.findMany({
    orderBy: { name: 'asc' }
  });

  // 2. Business Logic
  const currentMonth = new Date().getMonth();
  const totalFriends = friends.length;
  const closeFriends = friends.filter(f => f.proximity === 'CLOSE' || f.proximity === 'FAMILY').length;
  const birthdaysThisMonth = friends.filter(f => {
    if (!f.birthday) return false;
    return f.birthday.getMonth() === currentMonth;
  }).length;

  // 3. Serialization
  const serializedFriends = friends.map(f => ({
    ...f,
    birthday: f.birthday ? f.birthday.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    imageUrl: f.imageUrl || null,
    giftIdeas: f.giftIdeas || null,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* --- HEADER COM GRADIENTE PRIMARY --- */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-lg shadow-lg shadow-primary/25">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              Gestão de Conexões
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Centralize seus relacionamentos estratégicos e pessoais em um único CRM inteligente.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* O componente Dialog já deve conter o botão com variant="default" (primary) */}
            <FriendFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="px-6 md:px-10 py-8 space-y-10 max-w-[1600px] mx-auto">
        
        {/* --- KPI SECTION --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total de Conexões"
            value={totalFriends}
            icon={TrendingUp}
            description="Contatos registrados na base"
          />
          <StatCard 
            title="Círculo Íntimo"
            value={closeFriends}
            icon={Heart}
            description="Familiares e amigos próximos"
          />
          <StatCard 
            title="Aniversários (Mês)"
            value={birthdaysThisMonth}
            icon={Cake}
            description="Celebrações pendentes este mês"
          />
        </section>

        {/* --- LISTAGEM PRINCIPAL --- */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Sua Rede
                <span className="ml-3 text-sm font-medium text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                  {totalFriends}
                </span>
              </h2>
            </div>
            
            {/* Filtro Visual (Placeholder para funcionalidade futura) */}
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
               <Star className="h-4 w-4" />
               <span>Favoritos primeiro</span>
            </div>
          </div>
          
          {/* Container da Lista com Borda Suave */}
          <div className="rounded-xl border border-border/60 bg-card/50 shadow-sm backdrop-blur-[2px]">
             <FriendList initialData={serializedFriends} />
          </div>
        </section>

      </main>
    </div>
  );
}