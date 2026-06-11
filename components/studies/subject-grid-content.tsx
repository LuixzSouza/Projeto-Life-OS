"use client";

import { useState } from "react";
import { Plus, BookDashed, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/studies-math";
import { SubjectCard } from "./subject-card";
import type { RichSubject } from "./subject-grid-types";

interface SubjectGridContentProps {
  filteredSubjects: RichSubject[];
  rootSubjects: RichSubject[];
  childSubjects: RichSubject[];
  optimisticRemovedIds: Set<string>;
  displayMode: "flat" | "tree";
  subjects: RichSubject[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDetailsClick: (id: string) => void;
  onCreate: () => void;
}

export function SubjectGridContent({
  filteredSubjects,
  rootSubjects,
  childSubjects,
  optimisticRemovedIds,
  displayMode,
  subjects,
  onEdit,
  onDelete,
  onDetailsClick,
  onCreate,
}: SubjectGridContentProps) {
  const visibleCount = filteredSubjects.filter((s) => !optimisticRemovedIds.has(s.id)).length;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (visibleCount === 0) {
    return (
      <div className="text-center py-24 px-4 rounded-3xl border border-dashed border-border/60 bg-muted/10">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <BookDashed className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Nenhuma matéria encontrada</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
          Não encontramos nenhum tópico com os filtros atuais. Que tal criar um novo agora?
        </p>
        <Button onClick={onCreate} size="lg" className="shadow-lg shadow-primary/20 rounded-xl font-bold">
          <Plus className="h-5 w-5 mr-2" /> Criar Primeiro Tópico
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* 🟢 MODO GRADE (Árvore Agrupada em Grid Perfeito) */}
      {displayMode === "tree" ? (
        <div className="space-y-12">
          {rootSubjects.map((root) => {
            if (optimisticRemovedIds.has(root.id)) return null;
            const children = childSubjects.filter((c) => c.parentId === root.id && !optimisticRemovedIds.has(c.id));
            const isCollapsed = collapsed.has(root.id);
            const sectionMinutes = (root.totalMinutes ?? 0) + children.reduce((acc, c) => acc + (c.totalMinutes ?? 0), 0);

            return (
              <div key={root.id} className="space-y-5">

                {/* Cabeçalho da Seção (recolhível para escalar com muito conteúdo) */}
                <button
                  type="button"
                  onClick={() => toggleSection(root.id)}
                  className="w-full flex items-center gap-3 border-b border-border/40 pb-3 text-left group"
                >
                  {/* Barra com a COR da matéria raiz — identidade da seção */}
                  <div className="h-6 w-1.5 rounded-full" style={{ backgroundColor: root.color || "hsl(var(--primary))" }} />
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isCollapsed && "-rotate-90")} />
                  <h4 className="font-bold text-xl truncate group-hover:text-primary transition-colors">{root.title}</h4>
                  {children.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-muted/50 border-none shrink-0">
                      {children.length} {children.length === 1 ? "sub-tópico" : "sub-tópicos"}
                    </Badge>
                  )}
                  {sectionMinutes > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {formatMinutes(sectionMinutes)}
                    </span>
                  )}
                </button>

                {/* Pai e Filhos compartilham O MESMO GRID para não quebrar a tela.
                    Máx. 3 colunas: a área principal tem só 2/3 da página — com 4
                    colunas os cards ficavam espremidos/truncando tudo. */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Matéria Raiz (destaque embutido no card — borda primária) */}
                    <SubjectCard
                      subject={root}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onDetailsClick={onDetailsClick}
                      parentName={undefined}
                      viewMode="grid"
                      isRoot
                    />

                    {/* Matérias Filhas */}
                    {children.map((child) => (
                      <SubjectCard
                        key={child.id}
                        subject={child}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDetailsClick={onDetailsClick}
                        parentName={root.title}
                        viewMode="grid"
                      />
                    ))}
                  </div>
                )}

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
                onEdit={onEdit}
                onDelete={onDelete}
                onDetailsClick={onDetailsClick}
                parentName={subjects.find((p) => p.id === subject.parentId)?.title}
                viewMode="list"
              />
            ))}
        </div>
      )}
    </div>
  );
}
