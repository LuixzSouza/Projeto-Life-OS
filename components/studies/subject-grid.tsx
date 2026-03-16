"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { StudySubject } from "@prisma/client";
import { deleteSubject } from "@/app/(dashboard)/studies/actions";

import {
  Plus,
  GitFork,
  Search,
  SortAsc,
  Layers,
  FolderTree,
  BrainCircuit,
  AlertTriangle,
  BookDashed,
  ChevronRight,
  LayoutGrid
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { SubjectCard } from "./subject-card";
import { SubjectFormDialog } from "./subject-form-dialog";
import { SubjectDetailsModal } from "./subject-details-modal";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface RichSubject extends StudySubject {
  totalMinutes: number;
}

interface SubjectListProps {
  subjects: RichSubject[];
}

type SortOption = "totalMinutes" | "title" | "createdAt";

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

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
    } catch (err) {
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
      <div className="bg-card p-3 rounded-2xl border border-border/60 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar matérias..."
            className="pl-9 bg-muted/30 border-0 focus-visible:ring-1 shadow-none h-11 rounded-xl w-full"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
          {!isSearching && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "flat" | "tree")} className="w-full sm:w-auto">
              <TabsList className="h-11 w-full sm:w-auto grid grid-cols-2 rounded-xl p-1 bg-muted/50 border border-border/50">
                <TabsTrigger value="tree" className="text-xs font-bold rounded-lg"><LayoutGrid className="h-4 w-4 mr-2"/> Grade</TabsTrigger>
                <TabsTrigger value="flat" className="text-xs font-bold rounded-lg"><Layers className="h-4 w-4 mr-2"/> Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 w-full sm:w-[150px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-primary">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-11 w-full sm:w-[170px] rounded-xl bg-muted/30 border-border/50 font-medium text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <SortAsc className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalMinutes">Mais Focado</SelectItem>
              <SelectItem value="title">Ordem (A-Z)</SelectItem>
              <SelectItem value="createdAt">Mais Recente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ----------------- CONTEÚDO PRINCIPAL ----------------- */}
      {filteredSubjects.filter((s) => !optimisticRemovedIds.has(s.id)).length === 0 ? (
        <div className="text-center py-24 px-4 rounded-3xl border border-dashed border-border/60 bg-muted/10">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BookDashed className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Nenhuma matéria encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
            Não encontramos nenhum tópico com os filtros atuais. Que tal criar um novo agora?
          </p>
          <Button onClick={handleStartCreate} size="lg" className="shadow-lg shadow-primary/20 rounded-xl font-bold">
            <Plus className="h-5 w-5 mr-2" /> Criar Primeiro Tópico
          </Button>
        </div>
      ) : (
        <div className="pb-10">
          
          {/* 🟢 MODO GRADE (Árvore Agrupada em Grid Perfeito) */}
          {displayMode === "tree" ? (
            <div className="space-y-12">
              {rootSubjects.map((root) => {
                if (optimisticRemovedIds.has(root.id)) return null;
                const children = childSubjects.filter((c) => c.parentId === root.id && !optimisticRemovedIds.has(c.id));
                
                return (
                  <div key={root.id} className="space-y-5">
                    
                    {/* Cabeçalho da Seção */}
                    <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                        <div className="h-6 w-1.5 bg-primary rounded-full" />
                        <h4 className="font-bold text-xl">{root.title}</h4>
                        <Badge variant="secondary" className="text-xs bg-muted/50 border-none">{children.length} sub-tópicos</Badge>
                    </div>

                    {/* Pai e Filhos compartilham O MESMO GRID para não quebrar a tela */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        
                        {/* Matéria Raiz (Destaque Glow) */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-md opacity-60" />
                            <SubjectCard
                                subject={root}
                                onEdit={handleEdit}
                                onDelete={confirmDelete}
                                onDetailsClick={handleOpenDetails}
                                parentName={undefined}
                                viewMode="grid"
                            />
                        </div>

                        {/* Matérias Filhas */}
                        {children.map((child) => (
                            <SubjectCard
                                key={child.id}
                                subject={child}
                                onEdit={handleEdit}
                                onDelete={confirmDelete}
                                onDetailsClick={handleOpenDetails}
                                parentName={root.title}
                                viewMode="grid"
                            />
                        ))}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            
            /* 🟢 MODO LISTA (Barras Horizontais) */
            <div className="flex flex-col gap-3">
              {filteredSubjects
                .filter((s) => !optimisticRemovedIds.has(s.id))
                .map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onEdit={handleEdit}
                    onDelete={confirmDelete}
                    onDetailsClick={handleOpenDetails}
                    parentName={subjects.find((p) => p.id === subject.parentId)?.title}
                    viewMode="list" 
                  />
                ))}
            </div>
          )}
        </div>
      )}

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

      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent className="border-destructive/30 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <AlertTriangle className="h-6 w-6" /> Excluir Matéria?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80 mt-2">
              Tem certeza que deseja deletar permanentemente esta matéria? 
              <strong className="block mt-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
                Aviso: Todo o histórico de sessões, cronômetros e anotações vinculadas a este tópico será apagado para sempre.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20">
              Sim, excluir matéria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}