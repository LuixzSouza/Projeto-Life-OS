"use client";

import { useState } from "react";
import Link from "next/link";
import { FlashcardDeck, StudySubject } from "@prisma/client";
import { createDeck, deleteDeck } from "@/app/(dashboard)/flashcards/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Plus,
  Layers,
  Trash2,
  PlayCircle,
  Edit3,
  Link as LinkIcon,
  Zap,
  BrainCircuit,
  MoreVertical,
  GraduationCap,
  BookOpen,
  FolderTree,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type DeckWithCount = FlashcardDeck & {
  cards: { id: string }[];
  studySubject?: { 
    id: string; 
    title: string; 
    color?: string | null; 
    icon?: string | null 
  } | null;
};

interface DeckGridProps {
  decks: DeckWithCount[];
  subjects?: StudySubject[];
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export function DeckGrid({ decks, subjects = [] }: DeckGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Modal de Estudo
  const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);

  /* ------------------------------- ACTIONS -------------------------------- */

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject && !title) {
      setTitle(subject.title); // Sugere o nome da matéria
    }
  };

  async function handleCreate(formData: FormData) {
    if (selectedSubjectId && selectedSubjectId !== "none") {
      formData.append("subjectId", selectedSubjectId);
    }

    const toastId = toast.loading("Criando baralho...");
    const result = await createDeck(formData);

    if (result.success) {
      toast.success(result.message, { id: toastId });
      setIsCreateDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedSubjectId("");
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza? Todos os cartões serão perdidos.")) return;

    const toastId = toast.loading("Removendo baralho...");
    const result = await deleteDeck(id);

    result.success
      ? toast.success("Baralho removido.", { id: toastId })
      : toast.error("Erro ao remover.", { id: toastId });
  }

  /* ------------------------------------------------------------------------ */
  /* JSX                                                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-8">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 md:px-8">
        <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Meus Baralhos
            </h2>
            <p className="text-sm text-muted-foreground">
                {decks.length} coleção{decks.length !== 1 && "ões"} de estudo
            </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              Novo Baralho
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Baralho</DialogTitle>
              <DialogDescription>
                Organize seus flashcards por tema ou matéria.
              </DialogDescription>
            </DialogHeader>

            <form action={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  name="title"
                  placeholder="Ex: Vocabulário Inglês"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Matéria (Opcional)</Label>
                <Select value={selectedSubjectId} onValueChange={handleSubjectSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a um tópico..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sem vínculo --</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.icon ? `${s.icon} ` : ""}{s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  name="description"
                  placeholder="Do que se trata este baralho?"
                  className="resize-none h-24"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRID */}
      <div className="px-6 md:px-8">
        {decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                    <BrainCircuit className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Sua biblioteca está vazia</h3>
                <p className="text-muted-foreground max-w-sm text-center mt-1">
                    Crie seu primeiro baralho para começar a usar a repetição espaçada.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setIsCreateDialogOpen(true)}>
                    Criar agora
                </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
                <Card
                key={deck.id}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 flex flex-col"
                >
                {/* Visual Header Strip */}
                <div 
                    className="absolute inset-x-0 top-0 h-1.5 transition-all duration-500 opacity-80 group-hover:opacity-100"
                    style={{ 
                        background: deck.studySubject?.color 
                            ? deck.studySubject.color 
                            : "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary)/0.5))" 
                    }} 
                />

                <CardHeader className="pb-3 pt-6">
                    <div className="flex justify-between items-start gap-2">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {deck.studySubject ? (
                                <Badge variant="outline" className="gap-1 pl-1 pr-2 py-0 h-6 border-primary/20 bg-primary/5 text-primary">
                                    <div className="w-4 h-4 rounded-full bg-background flex items-center justify-center text-[10px] border border-primary/20">
                                        {deck.studySubject.icon || <LinkIcon className="w-2.5 h-2.5" />}
                                    </div>
                                    <span className="truncate max-w-[100px]">{deck.studySubject.title}</span>
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="gap-1 h-6 bg-muted text-muted-foreground">
                                    <FolderTree className="w-3 h-3" /> Geral
                                </Badge>
                            )}
                        </div>

                        {/* Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={`/flashcards/${deck.id}/edit`}>
                                <DropdownMenuItem className="cursor-pointer">
                                <Edit3 className="h-4 w-4 mr-2" />
                                Editar Baralho
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => handleDelete(deck.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {deck.title}
                    </CardTitle>

                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs">
                    {deck.description || "Sem descrição definida para este baralho."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
                        <Layers className="h-4 w-4 text-primary/70" />
                        <span className="font-medium text-foreground">{deck.cards.length}</span>
                        <span>cartões</span>
                    </div>
                </CardContent>

                <CardFooter className="pt-0">
                    <Button
                        className={cn(
                            "w-full gap-2 transition-all",
                            deck.cards.length > 0 ? "shadow-md shadow-primary/10" : "opacity-80"
                        )}
                        variant={deck.cards.length > 0 ? "default" : "secondary"}
                        onClick={() => {
                            if (deck.cards.length === 0) {
                                window.location.href = `/flashcards/${deck.id}/edit`; 
                            } else {
                                setStudyDeck(deck);
                            }
                        }}
                    >
                        {deck.cards.length > 0 ? (
                            <>
                                <PlayCircle className="h-4 w-4" /> Praticar Agora
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" /> Adicionar Cartões
                            </>
                        )}
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        )}
      </div>

      {/* STUDY MODAL */}
      <Dialog open={!!studyDeck} onOpenChange={(o) => !o && setStudyDeck(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl">
            
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border-b">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-3">
                        <div className="p-2 bg-background rounded-xl shadow-sm">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                        </div>
                        Central de Estudo
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Você vai estudar <strong>{studyDeck?.title}</strong>. Escolha sua estratégia:
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Modo Prova */}
                <Link
                    href={`/flashcards/${studyDeck?.id}/study?mode=cram`}
                    className="group p-6 hover:bg-muted/30 transition-colors flex flex-col gap-3"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 group-hover:bg-orange-500/20 transition-colors">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-lg text-foreground">Modo Prova</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Ignora o agendamento e revisa tudo agora. Ideal para provas amanhã.
                    </p>
                </Link>

                {/* Modo Memória */}
                <Link
                    href={`/flashcards/${studyDeck?.id}/study?mode=smart`}
                    className="group p-6 hover:bg-muted/30 transition-colors flex flex-col gap-3 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1.5 bg-primary text-[10px] font-bold text-primary-foreground rounded-bl-xl shadow-sm">
                        RECOMENDADO
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-lg text-foreground">Modo Memória</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Usa o algoritmo de <strong>Repetição Espaçada</strong>. Estude apenas o que está prestes a esquecer.
                    </p>
                </Link>
            </div>

            <div className="p-4 bg-muted/20 border-t flex justify-end">
                <Button variant="ghost" onClick={() => setStudyDeck(null)}>
                    Cancelar
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}