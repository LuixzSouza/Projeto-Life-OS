import { notFound } from "next/navigation";
import { getNote, getNotes, getNoteSubjects, getNoteProjects, getNoteBacklinks } from "../actions";
import { getNotebooks } from "../notebook-actions";
import { getPaletteTasks } from "../../palette-actions";
import { NoteFullEditor } from "@/components/notes/note-full-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar nota | Life OS" };

export default async function NoteEditPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const note = await getNote(id);
  if (!note) return notFound();

  const [notebooks, subjects, projects, allNotes, tasks, backlinks] = await Promise.all([
    getNotebooks(),
    getNoteSubjects(),
    getNoteProjects(),
    getNotes(),
    getPaletteTasks(),
    getNoteBacklinks(id),
  ]);

  // Notas para o menu "@" (sem a atual; só id + título).
  const mentionNotes = allNotes
    .filter((n) => n.id !== id)
    .map((n) => ({ id: n.id, title: n.title }));

  return (
    <NoteFullEditor
      note={note}
      notebooks={notebooks}
      subjects={subjects}
      projects={projects}
      mentionNotes={mentionNotes}
      mentionTasks={tasks}
      backlinks={backlinks}
    />
  );
}
