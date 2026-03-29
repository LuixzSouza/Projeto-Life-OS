import { prisma } from "@/lib/prisma";
import { Users, Heart, TrendingUp, CalendarHeart } from "lucide-react";
import { FriendList } from "@/components/social/friend-list";
import { FriendFormDialog } from "@/components/social/add-friend-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  colorClass?: string;
}

// --- Componente Local: Card de Estatística (Design Limpo e Minimalista) ---
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  colorClass = "text-primary bg-primary/10 ring-primary/20" 
}: StatCardProps) {
  return (
    <Card className="bg-card border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        
        {description && (
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground truncate pr-2">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Página Principal (Server Component) ---
export default async function SocialPage() {
  // 1. Data Fetching
  const friends = await prisma.friend.findMany({
    orderBy: { name: 'asc' }
  });

  // 2. Business Logic
  const currentMonth = new Date().getMonth();
  const totalFriends = friends.length;
  
  const closeFriends = friends.filter(f => f.proximity === 'CLOSE' || f.proximity === 'FAMILY').length;
  
  const birthdaysThisMonth = friends.filter(f => {
    if (!f.birthday) return false;
    return f.birthday.getUTCMonth() === currentMonth;
  }).length;

  // 3. Serialization
  const serializedFriends = friends.map(f => ({
    ...f,
    birthday: f.birthday ? f.birthday.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    imageUrl: f.imageUrl || null,
    giftIdeas: f.giftIdeas || null,
    tags: f.tags || null,
    nickname: f.nickname || null,
    email: f.email || null,
    phone: f.phone || null,
    instagram: f.instagram || null,
    linkedin: f.linkedin || null,
    twitter: f.twitter || null,
    jobTitle: f.jobTitle || null,
    company: f.company || null,
    pixKey: f.pixKey || null,
    address: f.address || null,
    notes: f.notes || null,
  }));

  return (
    <div className="min-h-screen bg-background w-full pb-12">
      
      {/* --- HEADER SÓBRIO E FIXO --- */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-6 md:px-8 py-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Conexões & Networking
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Centralize seus relacionamentos estratégicos e pessoais em um único local.
              </p>
            </div>
          </div>
          
          {/* Botão de Adição Rápida */}
          <div className="shrink-0 w-full md:w-auto flex">
            <FriendFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full px-6 md:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        
        {/* --- KPI SECTION --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatCard 
            title="Rede Total"
            value={totalFriends}
            icon={TrendingUp}
            description="Contatos registrados na base"
            colorClass="text-blue-600 bg-blue-500/10"
          />
          <StatCard 
            title="Círculo Íntimo"
            value={closeFriends}
            icon={Heart}
            description="Familiares e amigos próximos"
            colorClass="text-amber-600 bg-amber-500/10"
          />
          <StatCard 
            title="Aniversários (Mês)"
            value={birthdaysThisMonth}
            icon={CalendarHeart}
            description="Celebrações pendentes este mês"
            colorClass="text-pink-600 bg-pink-500/10"
          />
        </section>

        {/* --- LISTAGEM PRINCIPAL --- */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Sua Rede
            </h2>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-md">
               Aniversariantes do mês aparecem no topo
            </p>
          </div>
          
          <div className="bg-card/50 rounded-xl border border-border/60 shadow-sm backdrop-blur-[2px]">
             <FriendList initialData={serializedFriends} />
          </div>
        </section>

      </main>
    </div>
  );
}