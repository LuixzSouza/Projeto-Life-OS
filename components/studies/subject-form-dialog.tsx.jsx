// components/studies/subject-form-dialog.jsx (ou .js)

"use client";

import { createSubject, updateSubject } from "@/app/(dashboard)/studies/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Gauge, Hash } from "lucide-react";
import { toast } from "sonner";
// StudySubject não pode ser importado se for JS puro
import React, { useState, FormEvent } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


/**
 * @typedef {Object} SubjectData
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string | null} icon
 * @property {number} difficulty
 * @property {number} goalMinutes
 * @property {string} color
 * @property {Date} createdAt
 * @property {number=} totalMinutes
 */

/**
 * @typedef {Object} SubjectFormDialogProps
 * @property {boolean} open
 * @property {function(): void} onClose
 * @property {SubjectData | null} [currentSubject]
 */


// Opções de Dificuldade para o Select
const DIFFICULTY_OPTIONS = [
    { value: '1', label: '1 - Muito Fácil' },
    { value: '3', label: '3 - Padrão' },
    { value: '5', 'label': '5 - Expert' },
];

// Helper para converter minutos para horas (com precisão)
const minutesToHours = (minutes) => minutes / 60;
const hoursToMinutes = (hours) => Math.round(hours * 60);


/**
 * @param {SubjectFormDialogProps} props
 */
export function SubjectFormDialog({ open, onClose, currentSubject }) {
    const isEditing = !!currentSubject;
    
    // --- ESTADOS INICIAIS (Valores padrão da prop) ---
    const initialData = {
        
        title: currentSubject?.title || '',
        
        category: currentSubject?.category || '',
        
        goalMinutes: currentSubject?.goalMinutes?.toString() || '3600',
        
        difficulty: currentSubject?.difficulty?.toString() || '3',
        
        icon: currentSubject?.icon || '',
    };
    
    // --- ESTADOS DO FORMULÁRIO ---
    const [title, setTitle] = useState(initialData.title);
    const [category, setCategory] = useState(initialData.category);
    const [goalMinutes, setGoalMinutes] = useState(initialData.goalMinutes);
    const [difficulty, setDifficulty] = useState(initialData.difficulty);
    const [icon, setIcon] = useState(initialData.icon);


    // Sincroniza o estado interno APENAS quando o modal abre ou a matéria de edição muda.
    // O erro do linter persiste, mas não impede a execução do JS.
    // Usamos useEffect para atualizar os valores quando a prop 'currentSubject' muda.
    React.useEffect(() => {
        if (open) {
             
             setTitle(initialData.title);
             
             setCategory(initialData.category);
             
             setGoalMinutes(initialData.goalMinutes);
             
             setDifficulty(initialData.difficulty);
             
             setIcon(initialData.icon);
        }
    }, [open, currentSubject, initialData.title, initialData.category, initialData.goalMinutes, initialData.difficulty, initialData.icon]);


    async function handleSubmit(event) {
        event.preventDefault(); 
        
        const form = event.currentTarget;
        const formData = new FormData(form);
        
        // Sincroniza os valores dos estados no FormData antes do envio
        formData.set('difficulty', difficulty);
        formData.set('goalMinutes', goalMinutes);
        formData.set('icon', icon);
        
        if (isEditing && currentSubject) {
            formData.set('id', currentSubject.id);
        }

        const action = isEditing ? updateSubject : createSubject;
        const toastId = toast.loading(isEditing ? "Atualizando matéria..." : "Criando nodo...");

        try {
            const result = await action(formData); 

            if (result.success) {
                toast.success(result.message, { id: toastId });
                onClose(); 
            } else {
                toast.error(result.message, { id: toastId, duration: 5000 });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        }
    }
    
    const goalHours = minutesToHours(parseInt(goalMinutes) || 0);

    const handleGoalHoursChange = (e) => {
        const hours = parseFloat(e.target.value) || 0;
        setGoalMinutes(hoursToMinutes(hours).toString());
    };


    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-indigo-500">
                        {isEditing ? `Editar: ${initialData.title}` : 'Criar Novo Nodo de Conhecimento'}
                    </DialogTitle>
                </DialogHeader>
                
                {/* O onsubmit chama a função handleSubmit no lado do cliente */}
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    
                    {/* Linha 1: Título e Categoria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Nome do Assunto</Label>
                            <Input 
                                id="title" 
                                name="title" 
                                placeholder="Ex: React Query" 
                                required 
                                autoComplete="off"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Nodo Pai (Categoria)</Label>
                            <Input 
                                id="category" 
                                name="category" 
                                placeholder="Ex: Front-end" 
                                autoComplete="off" 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Linha 2: Dificuldade e Meta */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="difficulty" className="flex items-center gap-1">
                                <Gauge className="h-4 w-4 text-zinc-500" /> Nível de Dificuldade
                            </Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o nível" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DIFFICULTY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="goalHoursDisplay" className="flex items-center gap-1">
                                <Target className="h-4 w-4 text-zinc-500" /> Meta de Foco (Horas)
                            </Label>
                            <Input 
                                id="goalHoursDisplay" 
                                type="number" 
                                step="0.5" 
                                placeholder="Ex: 60"
                                value={goalHours.toFixed(1)} 
                                onChange={handleGoalHoursChange}
                            />
                            <p className="text-[10px] text-zinc-500 text-right">
                                Meta em minutos: {goalMinutes}
                            </p>
                        </div>
                    </div>
                    
                    {/* Campo Icon (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="icon" className="flex items-center gap-1">
                            <Hash className="h-4 w-4 text-zinc-500" /> Ícone/Emoji
                        </Label>
                        <Input 
                            id="icon" 
                            name="icon" 
                            placeholder="Ex: ⚛️ ou react" 
                            value={icon} 
                            onChange={(e) => setIcon(e.target.value)}
                            autoComplete="off" 
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">
                            {isEditing ? 'Salvar Alterações' : 'Adicionar ao Mapa'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}