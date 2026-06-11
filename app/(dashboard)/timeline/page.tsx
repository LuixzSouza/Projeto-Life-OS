import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { getRecentActivity, getActivityInsights } from "@/lib/activity";
import { History, Activity } from "lucide-react";
import { TimelineFeed } from "@/components/timeline/timeline-feed";
import { TimelineInsights } from "@/components/timeline/timeline-insights";
import { AskAiButton } from "@/components/ai/ask-ai-button";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const [items, insights] = await Promise.all([
    getRecentActivity(120),
    getActivityInsights(),
  ]);

  return (
    <PageShell>
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Linha do Tempo"
        description="Tudo o que aconteceu no seu Life OS, em ordem cronológica."
        actions={
          <AskAiButton
            q="Olhe minha atividade recente na linha do tempo e me conte: em que módulos estou mais ativo, o que andei deixando de lado e que padrões você percebe na minha rotina?"
            label="Analisar com IA"
            title="A IA lê sua atividade recente e aponta padrões"
          />
        }
      />
      <PageContainer className="space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-20 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.<br />
              Conforme você usar o sistema, suas ações aparecem aqui.
            </p>
          </div>
        ) : (
          <>
            <TimelineInsights insights={insights} />
            <TimelineFeed initialItems={items} />
          </>
        )}
      </PageContainer>
    </PageShell>
  );
}
