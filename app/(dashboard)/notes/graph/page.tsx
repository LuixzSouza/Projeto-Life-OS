import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { Network } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getNoteGraph } from "../graph-actions";
import { NoteGraphView } from "@/components/notes/note-graph";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grafo de Conexões | Life OS" };

export default async function NoteGraphPage() {
  const graph = await getNoteGraph();

  return (
    <PageShell>
      <PageHeader
        icon={<Network className="h-5 w-5" />}
        title="Grafo de Conexões"
        description="Seu segundo cérebro visto de cima: cada nota é um nó; links no texto e Conexões viram fios."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link href="/notes">← Voltar às notas</Link>
          </Button>
        }
      />
      <PageContainer>
        <NoteGraphView graph={graph} />
      </PageContainer>
    </PageShell>
  );
}
