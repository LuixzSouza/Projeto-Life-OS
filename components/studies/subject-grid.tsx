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
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20">
            <GitFork className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight leading-none text-foreground">Árvore de Matérias</h3>
            <p className="text-sm text-muted-foreground mt-1">{subjects.length} tópicos cadastrados na base.</p>
          </div>
        </div>

        <Button onClick={handleStartCreate} size="lg" className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all rounded-xl font-bold">
          <Plus className="h-5 w-5" /> Novo Tópico
        </Button>
      </div>

      <Link href="/flashcards" className="block group">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 hover:border-primary/40 transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md rounded-2xl">
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="flex items-center justify-between p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background rounded-xl shadow-sm border border-border/50 group-hover:scale-110 transition-transform duration-300">
                <BrainCircuit className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  Sistema de Flashcards
                  <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold px-2 uppercase">Novo</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">Treine sua memória ativa e repetição espaçada usando as matérias cadastradas.</p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ChevronRight className="h-5 w-5 text-primary group-hover:text-current" />
            </div>
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
