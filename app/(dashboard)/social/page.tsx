import { prisma } from "@/lib/prisma";
import { Users, Heart, TrendingUp, CalendarHeart, MessageCircleHeart } from "lucide-react";
import { FriendList } from "@/components/social/friend-list";
import { FriendFormDialog } from "@/components/social/add-friend-dialog";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { getLastContacts } from "./actions";
import { isReconnectDue } from "@/lib/social-contact";

// --- Página Principal (Server Component) ---
export default async function SocialPage() {
  // 1. Data Fetching
  const userId = await getCurrentUserId();
  const friends = await prisma.friend.findMany({
    where: { userId: userId ?? "", deletedAt: null },
    include: {
      clients: { select: { id: true, name: true, company: true } }
    },
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

  // "Manter contato": último registro por amigo (ActivityLog) + quem está vencido.
  const lastContacts = await getLastContacts();
  const reconnectCount = friends.filter(f => isReconnectDue(lastContacts[f.id], f.proximity)).length;

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
    clients: f.clients,
  }));

  return (
    <PageShell>
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="Conexões & Networking"
        description="Centralize seus relacionamentos estratégicos e pessoais em um único local."
        actions={<FriendFormDialog mode="create" />}
      />

      <PageContainer className="space-y-8">

        {/* --- KPI SECTION --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            label="Rede Total"
            value={totalFriends}
            icon={TrendingUp}
            hint="Contatos registrados na base"
            iconClassName="text-blue-600 bg-blue-500/10"
          />
          <StatCard
            label="Círculo Íntimo"
            value={closeFriends}
            icon={Heart}
            hint="Familiares e amigos próximos"
            iconClassName="text-amber-600 bg-amber-500/10"
          />
          <StatCard
            label="Aniversários (Mês)"
            value={birthdaysThisMonth}
            icon={CalendarHeart}
            hint="Celebrações pendentes este mês"
            iconClassName="text-pink-600 bg-pink-500/10"
          />
          <StatCard
            label="Reconectar"
            value={reconnectCount}
            icon={MessageCircleHeart}
            hint="Sem contato há mais tempo que o ideal"
            iconClassName="text-rose-600 bg-rose-500/10"
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
             <FriendList initialData={serializedFriends} lastContacts={lastContacts} />
          </div>
        </section>

      </PageContainer>
    </PageShell>
  );
}