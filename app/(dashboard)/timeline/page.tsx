import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { getRecentActivity } from "@/lib/activity";
import { History, Activity } from "lucide-react";
import { TimelineFeed } from "@/components/timeline/timeline-feed";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const items = await getRecentActivity(80);

  return (
    <PageShell>
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Linha do Tempo"
        description="Tudo o que aconteceu no seu Life OS, em ordem cronológica."
      />
      <PageContainer>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.<br />
              Conforme você usar o sistema, suas ações aparecem aqui.
            </p>
          </div>
        ) : (
          <TimelineFeed items={items} />
        )}
      </PageContainer>
    </PageShell>
  );
}
