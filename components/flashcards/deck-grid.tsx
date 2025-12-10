"use client";

import { FlashcardDeck, StudySubject } from "@prisma/client";
import { createDeck, deleteDeck } from "@/app/(dashboard)/flashcards/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Layers, Trash2, PlayCircle, Edit3, Link as LinkIcon, BookOpen, Zap, BrainCircuit, Timer, TrendingUp, AlertCircle, MoreVertical, GraduationCap, ArrowBigLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Tipagem
type DeckWithCount = FlashcardDeck & {
    cards: { id: string }[];
    studySubject?: { title: string, color: string } | null;
};

interface DeckGridProps {
    decks: DeckWithCount[];
    subjects?: StudySubject[]; 
}

export function DeckGrid({ decks, subjects = [] }: DeckGridProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");

    // Estado do Modal de Estudo
    const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);

    // --- LÓGICA DE CRIAÇÃO ---
    const handleSubjectSelect = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        const subject = subjects.find(s => s.id === subjectId);
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
        if (!confirm("Tem certeza? Esta ação é irreversível e apagará todo o histórico deste baralho.")) return;
        
        const toastId = toast.loading("Removendo...");
        const result = await deleteDeck(id);
        
        if (result.success) toast.success("Baralho removido.", { id: toastId });
        else toast.error("Erro ao remover.", { id: toastId });
    }

    return (
        <div className="space-y-8 pb-20">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col gap-3" >
                    <Link href={"/studies"} className="space-y-2 group">
                        <span className="text-2xl font-extrabold flex items-center gap-3 text-zinc-800 dark:text-gray-100/50 tracking-tight">
                            <span className="p-2 bg-indigo-100 dark:bg-gray-800/45 dark:group-hover:bg-gray-700/45 rounded-full ">
                                <ArrowBigLeft className="h-6 w-6" />
                            </span>
                            Voltar
                        </span>
                    </Link>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold flex items-center gap-3 text-zinc-800 dark:text-zinc-100 tracking-tight">
                            <span className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Layers className="h-6 w-6" />
                            </span>
                            Biblioteca de Flashcards
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed text-sm">
                            Gerencie seus baralhos e utilize a ciência da <strong className="text-indigo-600 dark:text-indigo-400">Repetição Espaçada</strong> para fixar o conteúdo na memória de longo prazo.
                        </p>
                    </div>
                </div>
                
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 gap-2 font-semibold transition-all hover:scale-105">
                            <Plus className="h-5 w-5" /> Criar Novo Baralho
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Conjunto de Estudos</DialogTitle>
                            <DialogDescription>Crie um novo baralho para organizar seus cartões.</DialogDescription>
                        </DialogHeader>
                        <form action={handleCreate} className="space-y-4 mt-2">
                            <div className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                                <Label className="flex items-center gap-2 text-xs uppercase text-zinc-500 font-bold mb-2">
                                    <LinkIcon className="h-3 w-3" /> Vincular a uma Matéria (Opcional)
                                </Label>
                                <Select onValueChange={handleSubjectSelect} value={selectedSubjectId}>
                                    <SelectTrigger className="bg-white dark:bg-zinc-950">
                                        <SelectValue placeholder="Selecione uma matéria..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Sem Vínculo --</SelectItem>
                                        {subjects.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.title} ({s.category})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Título</Label>
                                    <Input name="title" placeholder="Ex: Termos Técnicos" required value={title} onChange={(e) => setTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Input name="category" placeholder="Ex: Geral" value={category} onChange={(e) => setCategory(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Textarea name="description" placeholder="Descreva o objetivo deste baralho..." className="resize-none h-24" />
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">Criar Baralho</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* --- GRID DE BARALHOS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Empty State */}
                {decks.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/30 dark:bg-zinc-900/30 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                        <div className="h-24 w-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Layers className="h-10 w-10 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-200">Sua biblioteca está vazia</h3> 
                        <p className="text-zinc-500 mt-2 max-w-sm">Os flashcards são a ferramenta mais poderosa para memorização ativa. Comece agora!</p>
                        <Button variant="outline" className="mt-8 border-indigo-200 hover:border-indigo-500 hover:text-indigo-600" onClick={() => setIsCreateDialogOpen(true)}>
                            Criar Primeiro Baralho
                        </Button>
                    </div>
                )}

                {decks.map((deck) => (
                    <Card key={deck.id} className="flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group relative overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        
                        {/* Faixa Decorativa Superior */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <CardHeader className="pb-2 relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-normal text-xs">
                                            {deck.category}
                                        </Badge>
                                        {deck.studySubject && (
                                            <Badge variant="outline" className="border-indigo-200 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-900 dark:text-indigo-400 gap-1 text-xs px-2">
                                                <LinkIcon className="h-2 w-2" /> Vinculado
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* --- MENU DE AÇÕES (CORRIGIDO) --- */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 -mr-2">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Opções do Baralho</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <Link href={`/flashcards/${deck.id}/edit`}>
                                            <DropdownMenuItem className="cursor-pointer">
                                                <Edit3 className="mr-2 h-4 w-4" /> Editar Cartões
                                            </DropdownMenuItem>
                                        </Link>
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 cursor-pointer"
                                            onClick={() => handleDelete(deck.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Baralho
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <CardTitle className="text-xl font-bold leading-tight text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {deck.title}
                            </CardTitle>
                            
                            {deck.studySubject && (
                                <p className="text-xs text-zinc-400 mt-1 font-medium">
                                    Matéria: <span className="text-zinc-600 dark:text-zinc-300">{deck.studySubject.title}</span>
                                </p>
                            )}
                            
                            <CardDescription className="line-clamp-2 text-sm mt-3 text-zinc-500 h-10 leading-relaxed">
                                {deck.description || "Sem descrição definida."}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-4 pt-2">
                            <div className="w-full bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    <Layers className="h-4 w-4 text-indigo-500" />
                                    {deck.cards.length} Cartões
                                </div>
                                {deck.cards.length > 0 ? (
                                    <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                ) : (
                                    <span className="text-[10px] text-zinc-400 italic">Vazio</span>
                                )}
                            </div>
                        </CardContent>
                        
                        <CardFooter className="pt-0">
                            <Button 
                                className="w-full h-11 gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-indigo-600 dark:hover:bg-indigo-200 transition-all font-bold shadow-sm group-hover:shadow-md" 
                                onClick={() => setStudyDeck(deck)}
                                disabled={deck.cards.length === 0}
                            >
                                <PlayCircle className="h-5 w-5" />
                                {deck.cards.length > 0 ? "PRATICAR AGORA" : "ADICIONE CARTÕES"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* --- MODAL DE SELEÇÃO DE ESTRATÉGIA DE ESTUDO (MANTIDO E INTEGRADO) --- */}
            <Dialog open={!!studyDeck} onOpenChange={(open) => !open && setStudyDeck(null)}>
                <DialogContent className="sm:max-w-3xl overflow-hidden p-0 gap-0 border-none">
                    
                    <div className="p-8 pb-4 bg-white dark:bg-zinc-950">
                        <DialogHeader>
                            <DialogTitle className="text-3xl flex items-center gap-3">
                                <BrainCircuit className="text-indigo-600 dark:text-indigo-400 h-8 w-8" /> 
                                Central de Estudo
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2 text-zinc-500">
                                Você vai estudar o baralho <strong className="text-zinc-800 dark:text-zinc-200">&quot;{studyDeck?.title}&quot;</strong>. <br/>
                                Escolha a estratégia ideal para o seu momento:
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="grid md:grid-cols-2">
                        
                        {/* OPÇÃO 1: MODO PROVA (CRAM) */}
                        <Link href={`/flashcards/${studyDeck?.id}/study?mode=cram`} className="group relative border-t border-r border-zinc-100 dark:border-zinc-800 p-8 hover:bg-red-50/50 dark:hover:bg-red-950/10 transition-colors flex flex-col justify-between">
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Badge variant="destructive" className="animate-pulse shadow-sm">Urgente</Badge>
                            </div>
                            
                            <div className="flex flex-col gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <Zap className="h-7 w-7" />
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-xl text-zinc-800 dark:text-zinc-100 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                                        Modo Prova (Intensivão)
                                    </h3>
                                    <p className="text-[11px] font-bold text-red-600/70 mt-1 uppercase tracking-wider">
                                        Curto Prazo • Aleatório
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
                                        Ignora níveis de aprendizado e mostra <strong>todos os cartões</strong>. Perfeito para revisar tudo antes de uma prova ou teste.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-red-100 dark:border-red-900/20 flex items-center gap-2 text-xs text-red-600/70 font-medium">
                                <AlertCircle className="h-4 w-4" /> Foco em volume, não em retenção.
                            </div>
                        </Link>

                        {/* OPÇÃO 2: MODO MEMÓRIA (SMART) */}
                        <Link href={`/flashcards/${studyDeck?.id}/study?mode=smart`} className="group relative border-t border-zinc-100 dark:border-zinc-800 p-8 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors bg-gradient-to-br from-transparent to-green-50/30 dark:to-green-900/5 flex flex-col justify-between">
                            <div className="absolute top-6 right-6">
                                <Badge className="bg-green-600 hover:bg-green-700 border-transparent text-white shadow-md">Recomendado</Badge>
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <GraduationCap className="h-7 w-7" />
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-xl text-zinc-800 dark:text-zinc-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                                        Modo Memória (Smart)
                                    </h3>
                                    <p className="text-[11px] font-bold text-green-600/70 mt-1 uppercase tracking-wider">
                                        Longo Prazo • Algoritmo Leitner
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
                                        O sistema prioriza o que você <strong>mais erra</strong> e esconde o que você já sabe. A forma cientificamente correta de aprender.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-green-100 dark:border-green-900/20 flex items-center gap-2 text-xs text-green-600/70 font-medium">
                                <Timer className="h-4 w-4" /> Maximiza a eficiência do tempo.
                            </div>
                        </Link>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 text-center border-t border-zinc-200 dark:border-zinc-800">
                        <Button variant="ghost" onClick={() => setStudyDeck(null)} className="text-zinc-500 hover:text-zinc-800">
                            Cancelar e Voltar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}