"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Layers, Trash2, PlayCircle, Edit3, Link as LinkIcon,
  MoreVertical, FolderTree, Zap, CheckCircle2,
} from "lucide-react";
import { countDue, type DeckWithCount } from "./deck-grid-types";

interface DeckCardProps {
  deck: DeckWithCount;
  onStudy: (deck: DeckWithCount) => void;
  onDelete: (deckId: string) => void;
}

export function DeckCard({ deck, onStudy, onDelete }: DeckCardProps) {
  const total = deck.cards.length;
  const hasCards = total > 0;
  const due = countDue(deck.cards);

  const mastered = deck.cards.filter((c) => c.box >= 4).length;
  const reviewing = deck.cards.filter((c) => c.box === 2 || c.box === 3).length;
  const learning = total - mastered - reviewing;
  const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  // Cor da matéria entra só como acento sutil no ícone.
  const accent = deck.studySubject?.color || "hsl(var(--primary))";

  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 text-lg"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              {deck.studySubject?.icon || <Layers className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base font-bold leading-tight transition-colors group-hover:text-primary">
                {deck.title}
              </CardTitle>
              <div className="mt-1">
                {deck.studySubject ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <LinkIcon className="h-3 w-3" /> {deck.studySubject.title}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <FolderTree className="h-3 w-3" /> Isolado
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <Link href={`/flashcards/${deck.id}/edit`}>
                  <DropdownMenuItem className="cursor-pointer py-2 font-medium">
                    <Edit3 className="mr-2 h-4 w-4" /> Editar cartões
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer py-2 font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete(deck.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir baralho
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardDescription className="mt-2 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted-foreground/80">
          {deck.description || "Sem descrição."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {/* Linha de status: total + a revisar */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold text-foreground">{total}</span>
            <span className="text-muted-foreground">{total === 1 ? "cartão" : "cartões"}</span>
          </span>
          {hasCards && (
            due > 0 ? (
              <Badge className="gap-1 border-none bg-primary/10 text-primary hover:bg-primary/20">
                <Zap className="h-3 w-3" /> {due} a revisar
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 border-none bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Em dia
              </Badge>
            )
          )}
        </div>

        {/* Barra de domínio segmentada */}
        {hasCards && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">Domínio</span>
              <span className="font-bold text-foreground">{masteredPct}%</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {mastered > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(mastered / total) * 100}%` }} />}
              {reviewing > 0 && <div className="h-full bg-amber-400" style={{ width: `${(reviewing / total) * 100}%` }} />}
              {learning > 0 && <div className="h-full bg-rose-400" style={{ width: `${(learning / total) * 100}%` }} />}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        {hasCards ? (
          <Button
            className="h-11 w-full gap-2 rounded-xl font-bold shadow-sm"
            onClick={() => onStudy(deck)}
          >
            <PlayCircle className="h-5 w-5" />
            {due > 0 ? `Revisar (${due})` : "Estudar"}
          </Button>
        ) : (
          <Link href={`/flashcards/${deck.id}/edit`} className="w-full">
            <Button variant="outline" className="h-11 w-full gap-2 rounded-xl border-dashed border-primary/40 font-bold text-primary hover:bg-primary/5">
              <Plus className="h-4 w-4" /> Criar cartões
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
