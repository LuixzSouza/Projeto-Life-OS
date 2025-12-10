"use client";

import { StudySubject } from "@prisma/client";
import { deleteSubject } from "@/app/(dashboard)/studies/actions";
import { Button } from "@/components/ui/button";
import { Plus, GitFork, BookOpen, Search, SortAsc, Filter, Loader2, Layers, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner"; 
import { SubjectCard } from "./subject-card";
import { SubjectFormDialog } from "./subject-form-dialog.tsx";
import { SubjectDetailsModal } from "./subject-details-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";


interface RichSubject extends StudySubject {
    totalMinutes: number; 
}

interface SubjectListProps {
    subjects: RichSubject[]; 
}

// Opções de Ordenação
const SORT_OPTIONS = [
    { value: 'title', label: 'Nome (A-Z)' },
    { value: 'totalMinutes', label: 'Mais Focado' },
    { value: 'createdAt', label: 'Mais Recente' },
];

export function SubjectGrid({ subjects }: SubjectListProps) {
    // --- ESTADOS DE CONTROLE GERAL ---
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [subjectToEdit, setSubjectToEdit] = useState<RichSubject | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null); 
    
    // ✅ NOVOS ESTADOS DE FILTRO E PESQUISA
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('totalMinutes');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' ou o nome da categoria

    // --- FUNÇÕES DE INTERAÇÃO (CRUD) ---

    const handleEdit = (id: string) => {
        const subject = subjects.find(s => s.id === id);
        if (subject) {
            setSubjectToEdit(subject);
            setIsFormDialogOpen(true);
        } else {
            toast.error("Matéria não encontrada para edição.");
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja deletar esta matéria e todos os seus registros?")) return;
        
        const toastId = toast.loading("Removendo matéria...");
        const result = await deleteSubject(id);

        toast.dismiss(toastId);
        toast[result.success ? 'success' : 'error'](result.message);
    }
    
    const handleStartCreate = () => {
        setSubjectToEdit(null);
        setIsFormDialogOpen(true);
    }
    
    const handleCloseForm = () => {
        setIsFormDialogOpen(false);
        setSubjectToEdit(null);
    }
    
    const handleCloseDetailsModal = () => {
        setIsDetailsModalOpen(false);
        setSelectedSubjectId(null);
    }

    const handleOpenDetails = (id: string) => {
        setSelectedSubjectId(id);
        setIsDetailsModalOpen(true);
    };

    // 🎯 LÓGICA DE FILTRAGEM E ORDENAÇÃO DINÂMICA
    const filteredAndSortedSubjects = useMemo(() => {
        let filtered = subjects;
        
        // 1. Filtragem por Pesquisa (Título e Categoria)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(sub => 
                sub.title.toLowerCase().includes(term) || 
                sub.category.toLowerCase().includes(term)
            );
        }

        // 2. Filtragem por Categoria
        if (filterCategory !== 'all') {
            filtered = filtered.filter(sub => 
                (sub.category || 'Sem Categoria') === filterCategory
            );
        }

        // 3. Ordenação
        filtered.sort((a, b) => {
            if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            }
            if (sortBy === 'totalMinutes') {
                return (b.totalMinutes || 0) - (a.totalMinutes || 0);
            }
            if (sortBy === 'createdAt') {
                // Datas: mais recente primeiro (b - a)
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        });

        // 4. Agrupamento por Categoria (para o Select de filtro e visualização)
        const categories = Array.from(new Set(subjects.map(s => s.category || 'Sem Categoria')));

        return { list: filtered, categories };

    }, [subjects, searchTerm, sortBy, filterCategory]);

    const { list: finalSubjectList, categories: uniqueCategories } = filteredAndSortedSubjects;


    return (
        <div className="space-y-6">
            
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
                    <GitFork className="h-5 w-5 text-indigo-500" />
                    Mapa de Matérias
                </h3>

                {/* Botão que inicia a Criação */}
                <Button 
                    size="sm" 
                    className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30"
                    onClick={handleStartCreate}
                >
                    <Plus className="h-4 w-4" /> Novo Nodo
                </Button>
            </div>

            <Link href="/flashcards" className="block group">
                <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 border-none text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Layers className="h-5 w-5 text-indigo-200" /> Flashcards
                            </h3>
                            <p className="text-xs text-indigo-100 mt-1">Memorização ativa e repetição espaçada.</p>
                        </div>
                        <ChevronRight className="h-6 w-6 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                </Card>
            </Link>

            {/* --- CONTROLES DE PESQUISA E FILTRO (Barra Dinâmica) --- */}
            <div className="flex flex-wrap gap-3 p-4 bg-zinc-800/60 rounded-xl border border-zinc-700">
                
                {/* Pesquisa */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                        placeholder="Pesquisar por Título ou Categoria..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-zinc-900 border-zinc-700 focus:border-indigo-500"
                    />
                </div>
                
                {/* Filtro por Categoria */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700 text-zinc-300">
                        <Filter className="h-4 w-4 mr-2 text-indigo-400" />
                        <SelectValue placeholder="Filtrar por Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Categorias</SelectItem>
                        {uniqueCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Ordenação */}
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700 text-zinc-300">
                        <SortAsc className="h-4 w-4 mr-2 text-indigo-400" />
                        <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                        {SORT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>


            {/* --- LISTA DE CARDS RICOS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                
                {finalSubjectList.length === 0 && subjects.length > 0 && (
                     <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 flex flex-col items-center justify-center">
                         <Search className="h-10 w-10 text-zinc-700 mb-3" />
                         <p className="text-zinc-500 font-semibold">Nenhuma matéria corresponde à pesquisa.</p>
                         <p className="text-sm text-zinc-600">Tente ajustar seus filtros ou termos de busca.</p>
                     </div>
                )}

                {subjects.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 flex flex-col items-center justify-center">
                        <BookOpen className="h-10 w-10 text-zinc-700 mb-3" />
                        <p className="text-zinc-500 font-semibold">Seu mapa de conhecimento está vazio.</p>
                        <p className="text-sm text-zinc-600">Comece adicionando seu primeiro *Nodo*!</p>
                    </div>
                )}
                
                {finalSubjectList.map((sub) => (
                    <SubjectCard 
                        key={sub.id}
                        subject={sub}
                        onDetailsClick={handleOpenDetails} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* ✅ MODAIS DE AÇÃO */}
            <SubjectFormDialog
                key={subjectToEdit?.id || 'create'} 
                open={isFormDialogOpen}
                onClose={handleCloseForm}
                currentSubject={subjectToEdit}
            />

            <SubjectDetailsModal
                subjectId={selectedSubjectId}
                open={isDetailsModalOpen}
                onClose={handleCloseDetailsModal}
            />
        </div>
    );
}