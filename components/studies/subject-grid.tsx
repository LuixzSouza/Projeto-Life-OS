"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudySubject } from "@prisma/client";
import { deleteSubject } from "@/app/(dashboard)/studies/actions";

import {
  Plus,
  GitFork,
  Search,
  SortAsc,
  Filter,
  Layers,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SubjectCard } from "./subject-card";
import { SubjectFormDialog } from "./subject-form-dialog";
import { SubjectDetailsModal } from "./subject-details-modal";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

interface RichSubject extends StudySubject {
  totalMinutes: number;
}

interface SubjectListProps {
  subjects: RichSubject[];
}

type SortOption = "totalMinutes" | "title" | "createdAt";
type CategoryFilter = "all" | string;

/* -------------------------------------------------------------------------- */
/*                               SORT OPTIONS                                 */
/* -------------------------------------------------------------------------- */

const SORT_OPTIONS: ReadonlyArray<{
  value: SortOption;
  label: string;
}> = [
  { value: "totalMinutes", label: "Mais Focado" },
  { value: "title", label: "Nome (A-Z)" },
  { value: "createdAt", label: "Mais Recente" },
];

/* -------------------------------------------------------------------------- */
/*                               COMPONENT                                    */
/* -------------------------------------------------------------------------- */

export function SubjectGrid({ subjects }: SubjectListProps) {
  /* ------------------------------- UI STATES ------------------------------ */
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  /* ----------------------------- DATA STATES ------------------------------ */
  const [subjectToEdit, setSubjectToEdit] = useState<RichSubject | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  /* --------------------------- FILTER / SORT ------------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("totalMinutes");
  const [filterCategory, setFilterCategory] =
    useState<CategoryFilter>("all");

  /* ------------------------------------------------------------------------ */
  /*                                 ACTIONS                                  */
  /* ------------------------------------------------------------------------ */

  const handleEdit = (id: string) => {
    const subject = subjects.find((s) => s.id === id);
    if (!subject) {
      toast.error("Matéria não encontrada.");
      return;
    }
    setSubjectToEdit(subject);
    setIsFormDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja deletar esta matéria e todos os seus registros?"
      )
    ) {
      return;
    }

    const toastId = toast.loading("Removendo matéria...");
    const result = await deleteSubject(id);
    toast.dismiss(toastId);

    result.success
      ? toast.success(result.message)
      : toast.error(result.message);
  };

  const handleStartCreate = () => {
    setSubjectToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleOpenDetails = (id: string) => {
    setSelectedSubjectId(id);
    setIsDetailsModalOpen(true);
  };

  /* ------------------------------------------------------------------------ */
  /*                     FILTER + SORT + CATEGORY MAP                          */
  /* ------------------------------------------------------------------------ */

  const { filteredSubjects, categories } = useMemo(() => {
    let list = [...subjects];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.category?.toLowerCase().includes(term)
      );
    }

    if (filterCategory !== "all") {
      list = list.filter(
        (s) => (s.category ?? "Sem Categoria") === filterCategory
      );
    }

    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "createdAt")
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      return (b.totalMinutes ?? 0) - (a.totalMinutes ?? 0);
    });

    const uniqueCategories = Array.from(
      new Set(subjects.map((s) => s.category ?? "Sem Categoria"))
    );

    return {
      filteredSubjects: list,
      categories: uniqueCategories,
    };
  }, [subjects, searchTerm, sortBy, filterCategory]);

  /* ------------------------------------------------------------------------ */
  /*                                   JSX                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <GitFork className="h-5 w-5 text-primary" />
          Mapa de Matérias
        </h3>

        <Button onClick={handleStartCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Novo Nodo
        </Button>
      </div>

      {/* FLASHCARDS */}
      <Link href="/flashcards" className="block group">
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <h3 className="flex items-center gap-2 font-bold text-lg">
                <Layers className="h-5 w-5 opacity-80" />
                Flashcards
              </h3>
              <p className="mt-1 text-xs opacity-80">
                Memorização ativa e repetição espaçada.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 opacity-70 group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </Link>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título ou categoria..."
            className="pl-10"
          />
        </div>

        <Select
          value={filterCategory}
          onValueChange={(value) =>
            setFilterCategory(value as CategoryFilter)
          }
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas as Categorias ({subjects.length})
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
        >
          <SelectTrigger className="w-[180px]">
            <SortAsc className="mr-2 h-4 w-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDetailsClick={handleOpenDetails}
          />
        ))}
      </div>

      {/* MODALS */}
      <SubjectFormDialog
        key={subjectToEdit?.id ?? "create"}
        open={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        currentSubject={subjectToEdit}
      />

      <SubjectDetailsModal
        subjectId={selectedSubjectId}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}
