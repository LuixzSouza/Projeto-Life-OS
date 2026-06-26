"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { deleteSubject } from "@/app/(dashboard)/studies/actions";
import { Plus, GitFork, BrainCircuit, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { SubjectFormDialog } from "./subject-form-dialog";
import { SubjectDetailsModal } from "./subject-details-modal";
import { SubjectGridToolbar } from "./subject-grid-toolbar";
import { SubjectGridContent } from "./subject-grid-content";
import { SubjectDeleteDialog } from "./subject-delete-dialog";
import type { RichSubject, SubjectListProps, SortOption } from "./subject-grid-types";

export type { RichSubject } from "./subject-grid-types";

export function SubjectGrid({ subjects }: SubjectListProps) {
  /* ------------------------------- UI STATES ------------------------------ */
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"flat" | "tree">("tree");

  /* ----------------------------- DATA STATES ------------------------------ */
  const [subjectToEdit, setSubjectToEdit] = useState<RichSubject | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  /* --------------------------- FILTER / SORT ------------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("totalMinutes");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- EFFECTS ---------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Deep-link /studies?subject=ID: abre direto a matéria (vindo de uma Nota,
  // do Dashboard, etc.). Lê do window p/ não exigir <Suspense> do useSearchParams,
  // e limpa a URL para um refresh não reabrir a modal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("subject");
    if (!id || !subjects?.some((s) => s.id === id)) return;
    // Sincroniza uma fonte externa (a URL) com o estado uma única vez na montagem
    // — não há fase de render onde isso possa ser feito (window só existe aqui).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSubjectId(id);
    setIsDetailsModalOpen(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, [subjects]);

  /* ------------------------------- ACTIONS -------------------------------- */
  const handleEdit = useCallback((id: string) => {
      const subject = subjects.find((s) => s.id === id) ?? null;
      if (!subject) return toast.error("Matéria não encontrada.");
      setSubjectToEdit(subject);
      setIsFormDialogOpen(true);
    },
    [subjects]
  );

  const confirmDelete = useCallback((id: string) => {
    setSubjectToDelete(id);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!subjectToDelete) return;
    const id = subjectToDelete;
    setSubjectToDelete(null);

    setOptimisticRemovedIds((prev) => new Set(prev).add(id));
    const toastId = toast.loading("Removendo matéria...");

    try {
      const result = await deleteSubject(id);
      toast.dismiss(toastId);

      if (result?.success) {
        toast.success(result.message ?? "Matéria removida.");
      } else {
        toast.error(result?.message ?? "Erro ao remover.");
        setOptimisticRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro de conexão.");
      setOptimisticRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [subjectToDelete]);

  const handleStartCreate = useCallback(() => {
    setSubjectToEdit(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenDetails = useCallback((id: string) => {
    setSelectedSubjectId(id);
    setIsDetailsModalOpen(true);
  }, []);

  /* ------------------------ FILTER + SORT + HIERARCHY ---------------------- */
  const { rootSubjects, childSubjects, filteredSubjects, categories } = useMemo(() => {
    let list = [...(subjects ?? [])];

    const categoriesSet = new Set<string>();
    for (const s of list) {
      if (s.category) categoriesSet.add(s.category);
    }
    const categories = Array.from(categoriesSet).sort();

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(
        (s) => s.title.toLowerCase().includes(term) || (s.category ?? "").toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((s) => (s.category ?? "uncategorized") === categoryFilter);
    }

    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "createdAt") return +new Date(b.createdAt) - +new Date(a.createdAt);
      return (b.totalMinutes ?? 0) - (a.totalMinutes ?? 0);
    });

    const root = list.filter((s) => !s.parentId);
    const children = list.filter((s) => !!s.parentId);

    return {
      filteredSubjects: list,
      rootSubjects: root,
      childSubjects: children,
      categories,
    };
  }, [subjects, debouncedSearch, categoryFilter, sortBy]);

  const isSearching = debouncedSearch.length > 0;
  const displayMode = isSearching ? "flat" : viewMode;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ----------------- HEADER & FLASHCARDS ----------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <GitFork className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-none text-foreground">Minhas matérias</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subjects.length} tópicos cadastrados.</p>
          </div>
        </div>

        <Button onClick={handleStartCreate} className="gap-2 font-medium">
          <Plus className="h-4 w-4" /> Novo tópico
        </Button>
      </div>

      <Link href="/flashcards" className="block group">
        <Card className="border-border/50 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  Flashcards
                  <Badge variant="secondary" className="h-5 border-none bg-primary/10 px-2 text-[10px] font-semibold text-primary">Novo</Badge>
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">Memória ativa e repetição espaçada com suas matérias.</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </CardContent>
        </Card>
      </Link>

      {/* ----------------- TOOLBAR DE FILTROS ----------------- */}
      <SubjectGridToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isSearching={isSearching}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* ----------------- CONTEÚDO PRINCIPAL ----------------- */}
      <SubjectGridContent
        filteredSubjects={filteredSubjects}
        rootSubjects={rootSubjects}
        childSubjects={childSubjects}
        optimisticRemovedIds={optimisticRemovedIds}
        displayMode={displayMode}
        subjects={subjects}
        onEdit={handleEdit}
        onDelete={confirmDelete}
        onDetailsClick={handleOpenDetails}
        onCreate={handleStartCreate}
      />

      {/* ----------------- MODALS ----------------- */}
      <SubjectFormDialog
        key={subjectToEdit?.id ?? "create"}
        open={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        currentSubject={subjectToEdit ?? undefined}
        potentialParents={subjects.filter((s) => !s.parentId && s.id !== subjectToEdit?.id)}
      />

      <SubjectDetailsModal
        subjectId={selectedSubjectId}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      <SubjectDeleteDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
        onConfirm={executeDelete}
      />
    </div>
  );
}
