"use client";

import { FlashcardDeck, StudySubject } from "@prisma/client";
import { createDeck, deleteDeck } from "@/app/(dashboard)/flashcards/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Layers,
  Trash2,
  PlayCircle,
  Edit3,
  Link as LinkIcon,
  Zap,
  BrainCircuit,
  Timer,
  AlertCircle,
  MoreVertical,
  GraduationCap,
  ArrowBigLeft,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

type DeckWithCount = FlashcardDeck & {
  cards: { id: string }[];
  studySubject?: { title: string; color: string } | null;
};

interface DeckGridProps {
  decks: DeckWithCount[];
  subjects?: StudySubject[];
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export function DeckGrid({ decks, subjects = [] }: DeckGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);

  /* ------------------------------- ACTIONS -------------------------------- */

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);

    if (subject) {
      setCategory(subject.category || "Geral");
      if (!title) setTitle(subject.title);
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
      setCategory("");
      setSelectedSubjectId("");
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Esta ação é irreversível. Deseja continuar?")) return;

    const toastId = toast.loading("Removendo baralho...");
    const result = await deleteDeck(id);

    result.success
      ? toast.success("Baralho removido.", { id: toastId })
      : toast.error("Erro ao remover.", { id: toastId });
  }

  /* ------------------------------------------------------------------------ */
  /*                                   JSX                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-10 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div className="space-y-4">
          <Link href="/studies" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowBigLeft className="h-5 w-5" />
            Voltar
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold flex items-center gap-3">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-6 w-6" />
              </span>
              Biblioteca de Flashcards
            </h2>

            <p className="text-sm text-muted-foreground max-w-lg">
              Organize seus baralhos e estude usando{" "}
              <strong className="text-primary">
                repetição espaçada
              </strong>
              .
            </p>
          </div>
        </div>

        {/* CREATE */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-primary/20">
              <Plus className="h-5 w-5" />
              Criar Baralho
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Baralho</DialogTitle>
              <DialogDescription>
                Crie um novo conjunto de estudos.
              </DialogDescription>
            </DialogHeader>

            <form action={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted p-4">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" />
                  Vincular Matéria
                </Label>

                <Select value={selectedSubjectId} onValueChange={handleSubjectSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma matéria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    name="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  name="description"
                  className="resize-none h-24"
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">
                  Criar Baralho
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <Card
            key={deck.id}
            className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition" />

            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <Badge variant="secondary">{deck.category}</Badge>
                  {deck.studySubject && (
                    <Badge variant="outline" className="text-primary">
                      Vinculado
                    </Badge>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opções</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href={`/flashcards/${deck.id}/edit`}>
                      <DropdownMenuItem>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(deck.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardTitle className="mt-2 group-hover:text-primary transition">
                {deck.title}
              </CardTitle>

              <CardDescription className="line-clamp-2">
                {deck.description || "Sem descrição."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex justify-between items-center rounded-lg border bg-muted p-3 text-sm">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {deck.cards.length} cartões
                </span>
                {deck.cards.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>
            </CardContent>
                <CardFooter>
                    <Button
                        className="w-full gap-2"
                        onClick={() => {
                        if (deck.cards.length === 0) {
                            // Redireciona diretamente para a página de edição de cartões se não houver cartões
                            window.location.href = `/flashcards/${deck.id}/edit`; 
                        } else {
                            // Inicia o estudo se houver cartões
                            setStudyDeck(deck);
                        }
                        }}
                        disabled={deck.cards.length === 0}
                    >
                        <PlayCircle className="h-5 w-5" />
                        {deck.cards.length > 0 ? "Praticar" : "Adicionar Cartões"}
                    </Button>
                </CardFooter>
          </Card>
        ))}
      </div>

      {/* STUDY MODAL */}
      <Dialog open={!!studyDeck} onOpenChange={(o) => !o && setStudyDeck(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <div className="p-8">
            <DialogHeader>
              <DialogTitle className="text-3xl flex items-center gap-3">
                <BrainCircuit className="h-8 w-8 text-primary" />
                Central de Estudo
              </DialogTitle>
              <DialogDescription>
                Escolha a melhor estratégia.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid md:grid-cols-2 border-t">
            <Link
              href={`/flashcards/${studyDeck?.id}/study?mode=cram`}
              className="p-8 hover:bg-destructive/5 transition"
            >
              <Zap className="h-8 w-8 text-destructive mb-4" />
              <h3 className="font-bold text-xl">Modo Prova</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Revisão rápida e intensiva.
              </p>
            </Link>

            <Link
              href={`/flashcards/${studyDeck?.id}/study?mode=smart`}
              className="p-8 hover:bg-primary/5 transition"
            >
              <GraduationCap className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-bold text-xl">Modo Memória</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Algoritmo inteligente de longo prazo.
              </p>
            </Link>
          </div>

          <div className="p-4 border-t text-center">
            <Button variant="ghost" onClick={() => setStudyDeck(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
