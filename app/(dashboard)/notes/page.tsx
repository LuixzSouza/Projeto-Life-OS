import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { NotebookPen } from "lucide-react";
import { getNotes, getNoteSubjects } from "./actions";
import { NotesClient } from "@/components/notes/notes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anotações | Life OS" };

export default async function NotesPage() {
  const [notes, subjects] = await Promise.all([getNotes(), getNoteSubjects()]);

  return (
    <PageShell>
      <PageHeader
        icon={<NotebookPen className="h-5 w-5" />}
        title="Anotações"
        description="Seu caderno de estudos: capture ideias, vincule a matérias e conecte com o resto do Life OS."
      />
      <PageContainer>
        <NotesClient initialNotes={notes} subjects={subjects} />
      </PageContainer>
    </PageShell>
  );
}
