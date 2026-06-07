import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { NotebookPen } from "lucide-react";
import { getNotes, getNoteProjects } from "./actions";
import { getNotebooks } from "./notebook-actions";
import { NotesClient } from "@/components/notes/notes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notas | Life OS" };

export default async function NotesPage() {
  const [notes, notebooks, projects] = await Promise.all([
    getNotes(),
    getNotebooks(),
    getNoteProjects(),
  ]);

  return (
    <PageShell>
      <PageHeader
        icon={<NotebookPen className="h-5 w-5" />}
        title="Notas"
        description="Seu segundo cérebro: capture textos e imagens em cadernos, do jeito que fizer sentido pra você."
      />
      <PageContainer>
        <NotesClient initialNotes={notes} initialNotebooks={notebooks} projects={projects} />
      </PageContainer>
    </PageShell>
  );
}
