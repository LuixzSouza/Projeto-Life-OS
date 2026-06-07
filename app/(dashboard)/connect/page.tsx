import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Network } from "lucide-react";
import { getTagsOverview, getAttachmentsCenter, getAllLinksCenter } from "./actions";
import { ConnectCenter } from "@/components/connect/connect-center";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const [tags, attachments, links] = await Promise.all([
    getTagsOverview(),
    getAttachmentsCenter(),
    getAllLinksCenter(),
  ]);

  return (
    <PageShell>
      <PageHeader
        icon={<Network className="h-5 w-5" />}
        title="Tags, Anexos & Conexões"
        description="O tecido que liga seus módulos: filtre por tags entre áreas, veja todos os anexos e o grafo de conexões num lugar só."
      />
      <PageContainer>
        <ConnectCenter initialTags={tags} initialAttachments={attachments} initialLinks={links} />
      </PageContainer>
    </PageShell>
  );
}
