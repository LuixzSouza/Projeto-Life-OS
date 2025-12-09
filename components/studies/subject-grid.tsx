"use client";

import { StudySubject } from "@prisma/client";
import { createSubject, deleteSubject } from "@/app/(dashboard)/studies/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Hexagon, GitFork, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// ✅ Importa o novo componente de Modal de Detalhes
import { SubjectDetailsModal } from "./subject-details-modal";


interface SubjectGridProps {
  subjects: StudySubject[];
}

// Subcomponente para o Modal de Exclusão do Cluster (Nó Pai)
function ClusterDeleteAction({ category, subjectId }: { category: string, subjectId: string }) {
    
    const handleDelete = async () => {
        const toastId = toast.loading(`Removendo ${category}...`);
        try {
            // A Server Action deleteSubject precisa estar configurada para deletar
            // o SUBJECT e suas SESSIONS (usando CASCADE no Prisma)
            const result = await deleteSubject(subjectId);
            toast.dismiss(toastId);
            toast[result.success ? 'success' : 'error'](result.message);
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    title={`Excluir Cluster: ${category}`}
                    className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-zinc-700/50 ml-auto transition-opacity"
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" /> Confirma a Exclusão?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Você está prestes a remover o **Nó Principal:** <span className="font-bold text-red-400">{category}</span>. 
                        Essa ação é irreversível e removerá todos os dados de estudo associados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Sim, Excluir Definitivamente
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


export function SubjectGrid({ subjects }: SubjectGridProps) {
  // --- NOVOS ESTADOS PARA DETALHES ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); // ✅ Controla o Modal de Detalhes
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null); // ✅ ID do Nó Clicado
  
  // 1. Agrupamento Lógico (Clusters)
  const clusters = useMemo(() => {
    const groups: Record<string, StudySubject[]> = {};
    
    subjects.forEach(sub => {
      const cat = sub.category || "Sem Categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(sub);
    });

    return groups;
  }, [subjects]);

  const categories = Object.keys(clusters);

  // 2. Função Wrapper para o Form
  async function handleCreateSubject(formData: FormData) {
    const toastId = toast.loading("Criando nodo...");
    
    try {
        const result = await createSubject(formData);

        if (result.success) {
            toast.success(result.message, { id: toastId });
            setIsDialogOpen(false); 
        } else {
            toast.error(result.message, { id: toastId });
        }
    } catch (error) {
        toast.error("Erro inesperado.", { id: toastId });
    }
  }

  // Helper para obter o ID do Cluster
  const getSubjectIdForCluster = (category: string) => {
    return clusters[category]?.[0]?.id || ''; 
  }

  // ✅ FUNÇÃO QUE O CARD DO ASSUNTO VAI CHAMAR
  const handleSubjectClick = (id: string) => {
      setSelectedSubjectId(id);       // Salva o ID
      setIsDetailsModalOpen(true);    // Abre o modal
  };

  const handleCloseDetailsModal = () => {
      setIsDetailsModalOpen(false);
      setSelectedSubjectId(null);
  }


  return (
    <div className="space-y-6">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
          <GitFork className="h-5 w-5 text-indigo-500" />
          Atlas de Conhecimento
        </h3>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30">
              <Plus className="h-4 w-4" /> Novo Nodo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Nodo de Conhecimento</DialogTitle>
            </DialogHeader>
            <form action={handleCreateSubject} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Nome do Assunto</Label>
                <Input id="title" name="title" placeholder="Ex: React Query" required autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Nodo Pai (Categoria)</Label>
                <Input id="category" name="category" placeholder="Ex: Front-end" autoComplete="off" />
                <p className="text-[10px] text-zinc-500">Isso criará o agrupamento no mapa.</p>
              </div>
              <DialogFooter>
                <Button type="submit">Adicionar ao Mapa</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- VISUALIZAÇÃO DE CLUSTERS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {categories.length === 0 && (
           <div className="col-span-full py-20 text-center border border-dashed border-zinc-700 rounded-2xl bg-zinc-900/50">
             <Hexagon className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
             <p className="text-zinc-500">Seu universo está vazio.</p>
             <p className="text-xs text-zinc-600">Crie um nodo para começar a mapear seu conhecimento.</p>
           </div>
        )}

        {categories.map((category) => (
          <div key={category} className="relative group">
            
            {/* CARD DO NÓ PAI (CATEGORIA) */}
            <div className="bg-zinc-800/60 border border-indigo-700/50 p-5 rounded-xl shadow-lg shadow-indigo-900/10 mb-4 transition-all duration-300 hover:border-indigo-500/80">
              
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-800/70 flex items-center justify-center shadow-lg">
                    <Hexagon className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                    <h4 className="text-xl font-extrabold text-zinc-100 tracking-tight">{category}</h4>
                    <span className="text-sm text-zinc-400">{clusters[category].length} Assuntos Mapeados</span>
                </div>
                
                <div className="ml-auto">
                    <ClusterDeleteAction 
                        category={category} 
                        subjectId={getSubjectIdForCluster(category)} 
                    />
                </div>
              </div>
            </div>

            {/* LISTA DE NÓS FILHOS (ASSUNTOS) */}
            <div className="relative pl-6 space-y-3">
              
              {/* Linha Vertical Sutil para indicar conexão */}
              <div className="absolute left-7 top-0 bottom-0 w-px bg-zinc-700/50"></div>

              {clusters[category].map((sub) => (
                <div key={sub.id} className="relative flex items-center gap-3 group/item">
                  
                  {/* Ponto de Conexão (Nó Filho) */}
                  <div 
                      className="absolute left-5 transform -translate-x-1/2 z-10 h-3 w-3 rounded-full border-2 border-zinc-800 transition-all duration-300 group-hover/item:scale-150 group-hover/item:border-indigo-400 group-hover/item:shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                      style={{ backgroundColor: sub.color || "#6366f1" }}
                  ></div>

                  {/* Card do Assunto (Clicável para ver detalhes/editar) */}
                  <div 
                    className="flex-1 ml-4 p-3 rounded-lg border border-zinc-800 bg-zinc-800/70 hover:bg-indigo-950/40 hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm flex justify-between items-center"
                    // ✅ CHAMADA CORRIGIDA PARA ACESSAR DETALHES
                    onClick={() => handleSubjectClick(sub.id)} 
                  >
                      <span className="text-sm font-medium text-zinc-300">
                          {sub.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-500 group-hover/item:text-indigo-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
      
      {/* ✅ RENDERIZAÇÃO DO MODAL DE DETALHES (Visível quando isDetailsModalOpen = true) */}
      <SubjectDetailsModal
        subjectId={selectedSubjectId}
        open={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
      />
    </div>
  );
}