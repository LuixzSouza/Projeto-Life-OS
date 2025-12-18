"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
// Importamos o tipo StudySubject do Prisma para garantir compatibilidade
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
  FolderTree,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SubjectCard } from "./subject-card";
import { SubjectFormDialog } from "./subject-form-dialog";
import { SubjectDetailsModal } from "./subject-details-modal";

/* -------------------------------------------------------------------------- */
/* TYPES                                   */
/* -------------------------------------------------------------------------- */

// Estendemos o tipo StudySubject para incluir a propriedade totalMinutes e parentId
interface RichSubject extends StudySubject {
  totalMinutes: number;
  // Opcional: Adicionar children se você já estiver trazendo do backend, 
  // mas aqui vamos filtrar no frontend para simplificar
}

interface SubjectListProps {
  subjects: RichSubject[];
}

type SortOption = "totalMinutes" | "title" | "createdAt";
type ViewMode = "grid" | "tree"; // Futuro: Visualização em árvore

/* -------------------------------------------------------------------------- */
/* SORT OPTIONS                                */
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
/* COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function SubjectGrid({ subjects }: SubjectListProps) {
  /* ------------------------------- UI STATES ------------------------------ */
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  /* ----------------------------- DATA STATES ------------------------------ */
  const [subjectToEdit, setSubjectToEdit] = useState<RichSubject | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  /* --------------------------- FILTER / SORT ------------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("totalMinutes");

  /* ------------------------------------------------------------------------ */
  /* ACTIONS                                   */
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
  /* FILTER + SORT + HIERARCHY LOGIC                     */
  /* ------------------------------------------------------------------------ */

  const { rootSubjects, childSubjects, filteredSubjects } = useMemo(() => {
    let list = [...subjects];

    // 1. Filtragem por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.category?.toLowerCase().includes(term)
      );
    }

    // 2. Ordenação
    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "createdAt")
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      return (b.totalMinutes ?? 0) - (a.totalMinutes ?? 0);
    });

    // 3. Separação Hierárquica
    // Root: Não tem parentId
    const root = list.filter(s => !s.parentId);
    // Child: Tem parentId
    const children = list.filter(s => !!s.parentId);

    return {
      filteredSubjects: list, // Lista plana filtrada e ordenada
      rootSubjects: root,
      childSubjects: children
    };
  }, [subjects, searchTerm, sortBy]);

  // Se houver busca, mostramos tudo misturado. Se não, mostramos organizado por abas.
  const isSearching = searchTerm.trim().length > 0;
  const displayList = isSearching 
    ? filteredSubjects 
    : (activeTab === "roots" ? rootSubjects : filteredSubjects);

  /* ------------------------------------------------------------------------ */
  /* JSX                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <GitFork className="h-5 w-5 text-primary" />
          Mapa de Matérias
        </h3>

        <Button onClick={handleStartCreate} className="gap-1 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          Novo Nodo
        </Button>
      </div>

      {/* FLASHCARDS CARD */}
      <Link href="/flashcards" className="block group">
        <Card className="bg-gradient-to-br from-primary/10 via-background to-transparent border border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <h3 className="flex items-center gap-2 font-bold text-lg text-primary">
                <Layers className="h-5 w-5" />
                Sistema de Flashcards
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Memorização ativa e repetição espaçada.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-primary opacity-70 group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </Link>

      {/* TOOLBAR (FILTERS & SORT) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar..."
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
            {/* Tabs para alternar visualização (Só mostra se não estiver buscando) */}
            {!isSearching && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">Tudo</TabsTrigger>
                        <TabsTrigger value="roots" className="gap-2">
                            <FolderTree className="w-3 h-3"/> Áreas (Pais)
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {/* Sort */}
            <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
            >
            <SelectTrigger className="w-[160px]">
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
      </div>

      {/* GRID CONTENT */}
      {displayList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum tópico encontrado com esses filtros.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayList.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDetailsClick={handleOpenDetails}
                // Passamos o pai se existir para mostrar breadcrumb no card (opcional, se SubjectCard suportar)
                parentName={subjects.find(p => p.id === subject.parentId)?.title}
              />
            ))}
          </div>
      )}

      {/* MODALS */}
      <SubjectFormDialog
        key={subjectToEdit?.id ?? "create"}
        open={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        currentSubject={subjectToEdit}
        // Passamos a lista completa para o select de "Pai"
        // Filtramos para não mostrar ele mesmo ou filhos dele (evitar ciclo básico)
        potentialParents={subjects.filter(s => !s.parentId && s.id !== subjectToEdit?.id)}
      />

      <SubjectDetailsModal
        subjectId={selectedSubjectId}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
}