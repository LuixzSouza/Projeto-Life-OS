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
  FolderTree,
  AlertTriangle,
  Loader2
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Modals View State
  const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ------------------------------- ACTIONS -------------------------------- */

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject && !title) {
      setTitle(subject.title); // Sugere o nome da matéria para facilitar
    }
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return toast.error("O título é obrigatório.");

    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    
    if (selectedSubjectId !== "none") {
      formData.set("subjectId", selectedSubjectId);
    }

    const toastId = toast.loading("Criando baralho...");
    const result = await createDeck(formData);

    if (result.success) {
      toast.success(result.message, { id: toastId });
      setIsCreateDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedSubjectId("none");
    } else {
      toast.error(result.message, { id: toastId });
    }
    setIsSubmitting(false);
  }

  async function executeDelete() {
    if (!deckToDelete) return;
    
    setIsDeleting(true);
    const toastId = toast.loading("Removendo baralho...");
    const result = await deleteDeck(deckToDelete);

    if (result.success) {
      toast.success("Baralho removido com sucesso.", { id: toastId });
      setDeckToDelete(null);
    } else {
      toast.error("Erro ao remover o baralho.", { id: toastId });
    }
    setIsDeleting(false);
  }

  /* ------------------------------------------------------------------------ */
  /* JSX                                                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2">
                Meus Baralhos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
                {decks.length} coleção{decks.length !== 1 && "ões"} criadas. Organize e estude!
            </p>
        </div>

        {/* DIALOG DE CRIAÇÃO */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if(!open) { setTitle(""); setDescription(""); setSelectedSubjectId("none"); }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold rounded-xl h-12">
              <Plus className="h-5 w-5" />
              Novo Baralho
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md border-border/60 shadow-2xl rounded-2xl overflow-hidden p-0">
            <div className="bg-muted/10 p-6 border-b border-border/40">
                <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Layers className="h-5 w-5" />
                    </div>
                    Criar Baralho
                </DialogTitle>
                <DialogDescription>
                    Agrupe seus cartões de estudo por tema ou matéria.
                </DialogDescription>
                </DialogHeader>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5 bg-background">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título <span className="text-destructive">*</span></Label>
                <Input
                  name="title"
                  placeholder="Ex: Vocabulário Inglês, Fórmulas de Física..."
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 font-medium bg-muted/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matéria Vinculada</Label>
                <Select value={selectedSubjectId} onValueChange={handleSubjectSelect}>
                  <SelectTrigger className="h-11 bg-muted/20">
                    <SelectValue placeholder="Vincular a uma matéria existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-semibold text-primary">-- Sem vínculo (Isolado) --</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.icon ? `${s.icon} ` : ""}{s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Selecione uma matéria para herdar o ícone e a cor.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Curta (Opcional)</Label>
                <Textarea
                  name="description"
                  placeholder="Para que serve este baralho?"
                  className="resize-none h-24 bg-muted/20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !title.trim()} className="shadow-lg shadow-primary/20 min-w-[120px]">
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Criar Baralho
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRID */}
      <div>
        {decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/60 rounded-3xl bg-muted/5">
                <div className="bg-background p-5 rounded-full shadow-sm mb-4 ring-1 ring-border/50">
                    <BrainCircuit className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Sua biblioteca está vazia</h3>
                <p className="text-muted-foreground max-w-sm text-center mt-2 leading-relaxed">
                    Crie seu primeiro baralho para começar a montar o seu acervo de memória de longo prazo.
                </p>
                <Button variant="default" className="mt-8 shadow-lg rounded-xl h-12 px-6" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" /> Criar agora
                </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => {
                const hasCards = deck.cards.length > 0;
                const cardColor = deck.studySubject?.color || "hsl(var(--primary))";

                return (
                  <Card
                  key={deck.id}
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col border-border/60 rounded-2xl bg-card"
                  >
                  {/* Faixa Colorida Superior */}
                  <div 
                      className="absolute inset-x-0 top-0 h-1.5 transition-all duration-500 opacity-80 group-hover:opacity-100"
                      style={{ backgroundColor: cardColor }} 
                  />
                  
                  {/* Brilho Sutil de Fundo */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at top right, ${cardColor}, transparent 70%)` }} />

                  <CardHeader className="pb-3 pt-6 relative z-10">
                      <div className="flex justify-between items-start gap-2">
                          
                          {/* Badge de Vínculo */}
                          <div className="flex flex-wrap gap-2 mb-2">
                              {deck.studySubject ? (
                                  <Badge variant="outline" className="gap-1.5 pl-1 pr-2.5 py-0.5 h-6 border-transparent bg-muted text-foreground/80 font-semibold shadow-sm">
                                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: `${cardColor}20`, color: cardColor }}>
                                          {deck.studySubject.icon || <LinkIcon className="w-2.5 h-2.5" />}
                                      </div>
                                      <span className="truncate max-w-[120px]">{deck.studySubject.title}</span>
                                  </Badge>
                              ) : (
                                  <Badge variant="secondary" className="gap-1 h-6 bg-muted/50 text-muted-foreground font-semibold">
                                      <FolderTree className="w-3 h-3" /> Isolado
                                  </Badge>
                              )}
                          </div>

                          {/* Menu de Ações (Oculto até Hover no Desktop) */}
                          <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground/60 hover:text-foreground">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Baralho</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <Link href={`/flashcards/${deck.id}/edit`}>
                                        <DropdownMenuItem className="cursor-pointer py-2.5 font-medium">
                                            <Edit3 className="h-4 w-4 mr-2" /> Editar Cartões
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2.5 font-medium" onClick={() => setDeckToDelete(deck.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Excluir Baralho
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                      </div>

                      <CardTitle className="text-xl leading-tight font-extrabold group-hover:text-primary transition-colors">
                        {deck.title}
                      </CardTitle>

                      <CardDescription className="line-clamp-2 min-h-[40px] text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                        {deck.description || "Nenhuma descrição fornecida."}
                      </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-4 flex-1 relative z-10 mt-2">
                      <div className={cn("flex items-center gap-2 text-sm p-3 rounded-xl border", hasCards ? "bg-muted/30 border-border/50 text-foreground" : "bg-orange-500/5 border-orange-500/20 text-orange-600/80")}>
                          {hasCards ? (
                            <>
                                <Layers className="h-4 w-4 text-primary/70" />
                                <span className="font-bold">{deck.cards.length}</span>
                                <span className="text-muted-foreground">cartões</span>
                            </>
                          ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <span className="font-semibold text-xs uppercase tracking-wider">Vazio. Adicione cartas.</span>
                            </>
                          )}
                      </div>
                  </CardContent>

                  <CardFooter className="pt-0 relative z-10">
                      <Button
                          className={cn("w-full gap-2 h-12 rounded-xl transition-all font-bold text-sm", hasCards ? "shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white" : "border-2 border-dashed border-primary/40 text-primary bg-transparent hover:bg-primary/5")}
                          variant={hasCards ? "default" : "outline"}
                          onClick={() => {
                              if (!hasCards) {
                                  window.location.href = `/flashcards/${deck.id}/edit`; 
                              } else {
                                  setStudyDeck(deck);
                              }
                          }}
                      >
                          {hasCards ? (
                              <><PlayCircle className="h-5 w-5" /> Iniciar Sessão</>
                          ) : (
                              <><Plus className="h-4 w-4" /> Criar Cartões</>
                          )}
                      </Button>
                  </CardFooter>
                  </Card>
                );
            })}
            </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STUDY MODAL (Onde o usuário escolhe como vai estudar hoje) */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!studyDeck} onOpenChange={(o) => !o && setStudyDeck(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-border/60 shadow-2xl rounded-2xl bg-background">
            
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border-b border-border/40">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-3 font-extrabold">
                        <div className="p-2.5 bg-background rounded-xl shadow-sm border border-border/50">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                        </div>
                        Central de Aprendizado
                    </DialogTitle>
                    <DialogDescription className="text-base text-foreground/80 mt-2">
                        Você está prestes a iniciar os estudos de <strong className="text-foreground">{studyDeck?.title}</strong>. Qual será a sua estratégia de hoje?
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                
                {/* Botão: Modo Prova */}
                <Link
                    href={`/flashcards/${studyDeck?.id}/study?mode=cram`}
                    className="group p-8 hover:bg-muted/30 transition-colors flex flex-col gap-3 focus:outline-none focus:bg-muted/50"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h3 className="font-extrabold text-xl text-foreground">Modo Prova</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Ignora a curva de esquecimento e revisa <strong className="text-foreground">TODO O BARALHO</strong> de uma vez. Ideal para vésperas de avaliações.
                    </p>
                </Link>

                {/* Botão: Modo Memória */}
                <Link
                    href={`/flashcards/${studyDeck?.id}/study?mode=smart`}
                    className="group p-8 hover:bg-muted/30 transition-colors flex flex-col gap-3 relative overflow-hidden focus:outline-none focus:bg-muted/50"
                >
                    <div className="absolute top-0 right-0 px-3 py-1.5 bg-primary text-[10px] font-black tracking-widest uppercase text-primary-foreground rounded-bl-2xl shadow-md">
                        RECOMENDADO
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <h3 className="font-extrabold text-xl text-foreground">Modo Inteligente</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Usa a <strong className="text-foreground">Repetição Espaçada</strong>. Foca apenas nos cartões que o seu cérebro está prestes a esquecer hoje.
                    </p>
                </Link>
            </div>

            <div className="p-5 bg-muted/10 border-t border-border/40 flex justify-end">
                <Button variant="outline" size="lg" className="rounded-xl font-bold h-12 px-8" onClick={() => setStudyDeck(null)}>
                    Cancelar
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* DELETE ALERT DIALOG */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog open={!!deckToDelete} onOpenChange={(open) => !open && setDeckToDelete(null)}>
        <AlertDialogContent className="border-destructive/30 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <AlertTriangle className="h-6 w-6" /> Excluir Baralho?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80 mt-2">
              Você está prestes a deletar este baralho.
              <strong className="block mt-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
                Aviso: TODOS os flashcards contidos nele serão apagados permanentemente e o progresso de revisão será perdido.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={isDeleting} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 min-w-[140px]">
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}