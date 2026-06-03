import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Trash2 } from "lucide-react";
import { getTrash } from "./actions";
import { TrashClient } from "@/components/trash/trash-client";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const items = await getTrash();
  return (
    <PageShell>
      <PageHeader
        icon={<Trash2 className="h-5 w-5" />}
        title="Lixeira"
        description="Itens removidos ficam aqui. Restaure ou exclua em definitivo."
      />
      <PageContainer>
        <TrashClient initial={items} />
      </PageContainer>
    </PageShell>
  );
}
