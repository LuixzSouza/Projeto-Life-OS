"use client";

import { createSubject, updateSubject } from "@/app/(dashboard)/studies/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Gauge, Hash, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import React, { useState, useCallback, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// Opções de Dificuldade
const DIFFICULTY_OPTIONS = [
    { value: '1', label: '1 - Muito Fácil' },
    { value: '2', label: '2 - Fácil' },
    { value: '3', label: '3 - Padrão' },
    { value: '4', label: '4 - Difícil' },
    { value: '5', label: '5 - Expert' },
];

const minutesToHours = (minutes) => (minutes / 60);
const hoursToMinutes = (hours) => Math.round(hours * 60);


export function SubjectFormDialog({ open, onClose, currentSubject }) {
    const isEditing = !!currentSubject;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- ESTADOS CONTROLADOS ---
    const [title, setTitle] = useState(currentSubject?.title || '');
    const [category, setCategory] = useState(currentSubject?.category || '');
    const [difficulty, setDifficulty] = useState(currentSubject?.difficulty?.toString() || '3');
    const [icon, setIcon] = useState(currentSubject?.icon || '');
    
    const [goalMinutes, setGoalMinutes] = useState(currentSubject?.goalMinutes?.toString() || '3600'); 
    const [goalHours, setGoalHours] = useState(minutesToHours(parseInt(currentSubject?.goalMinutes) || 3600)); 

    // --- 1. SINCRONIZAÇÃO DE PROPS COM ESTADO (Solução para o bug de edição) ---
    useEffect(() => {
        if (open) {
            if (currentSubject) {
                // Modo Edição: Sincroniza estados com dados atuais
                setTitle(currentSubject.title);
                setCategory(currentSubject.category);
                setDifficulty(currentSubject.difficulty.toString());
                setGoalMinutes(currentSubject.goalMinutes.toString());
                setGoalHours(minutesToHours(currentSubject.goalMinutes));
                setIcon(currentSubject.icon || '');
            } else {
                // Modo Criação: Reseta para valores padrão
                setTitle("");
                setCategory("");
                setDifficulty("3");
                setGoalMinutes("3600");
                setGoalHours(60);
                setIcon("");
            }
        }
    }, [currentSubject, open]);


    // --- HANDLERS ---
    
    /**
     * Converte a entrada de Horas (Display) para Minutos (Estado real)
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handleGoalHoursChange = (e) => {
        const hours = parseFloat(e.target.value) || 0;
        
        // 2. Input de horas fluidas: Atualiza o estado de exibição e o estado real de minutos
        setGoalHours(hours); 
        
        const minutes = hoursToMinutes(Math.min(hours, 1000));
        setGoalMinutes(minutes.toString());
    };

    /**
     * @param {React.FormEvent} event
     */
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault(); 
        setIsSubmitting(true);
        
        const currentGoalMinutes = parseInt(goalMinutes);
        
        // 6. Validação aprimorada
        if (!title.trim() || !category.trim() || currentGoalMinutes <= 0) {
            toast.error("O título, categoria e meta devem ser preenchidos e válidos.");
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        
        // Mapeamos os estados controlados para o FormData
        formData.set('title', title);
        formData.set('category', category);
        formData.set('difficulty', difficulty);
        formData.set('goalMinutes', goalMinutes);
        formData.set('icon', icon);
        
        if (isEditing && currentSubject) {
            formData.set('id', currentSubject.id);
        }

        const action = isEditing ? updateSubject : createSubject;
        const toastId = toast.loading(isEditing ? `Atualizando ${title}...` : "Criando nodo...");

        try {
            // 4. Server Action tipada (adicionado casting para segurança em JS/TS)
            const result = await action(formData); 

            if (result.success) {
                toast.success(result.message, { id: toastId });
                onClose(); 
            } else {
                toast.error(result.message || "Falha ao salvar a matéria.", { id: toastId, duration: 5000 });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    }, [title, category, difficulty, goalMinutes, icon, isEditing, currentSubject, onClose]);


    return (
        // ✅ Mantido o uso da 'key' se for estritamente necessário forçar o remount do SubjectGrid, 
        // mas a sincronização já foi movida para o useEffect.
        <Dialog open={open} onOpenChange={onClose}> 
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-indigo-500">
                        {isEditing ? `Editar: ${title}` : 'Criar Novo Nodo de Conhecimento'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    
                    {/* Linha 1: Título e Categoria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-xs uppercase font-semibold text-zinc-400">Nome do Assunto</Label>
                            <Input 
                                id="title" 
                                name="title" 
                                placeholder="Ex: React Query" 
                                required 
                                autoComplete="off"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-10 bg-zinc-800 border-zinc-700 focus:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-xs uppercase font-semibold text-zinc-400">Nodo Pai (Categoria)</Label>
                            <Input 
                                id="category" 
                                name="category" 
                                placeholder="Ex: Front-end" 
                                required
                                autoComplete="off" 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="h-10 bg-zinc-800 border-zinc-700 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    
                    {/* Linha 2: Dificuldade e Meta */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="difficulty" className="flex items-center gap-1 text-xs uppercase font-semibold text-zinc-400">
                                <Gauge className="h-3 w-3" /> Nível de Dificuldade
                            </Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Selecione o nível" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    {DIFFICULTY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* 5. Inputs Hidden Removidos/Simplificados */}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="goalHoursDisplay" className="flex items-center gap-1 text-xs uppercase font-semibold text-zinc-400">
                                <Target className="h-3 w-3" /> Meta de Foco (Horas)
                            </Label>
                            <Input 
                                id="goalHoursDisplay" 
                                type="number" 
                                step="1" 
                                min="1"
                                placeholder="Ex: 60"
                                // ✅ Usa o estado dedicado goalHours
                                value={goalHours} 
                                onChange={handleGoalHoursChange}
                                className="h-10 bg-zinc-800 border-zinc-700 text-lg font-bold text-indigo-400 focus:border-indigo-500"
                            />
                            
                            <p className="text-[10px] text-zinc-500 text-right">
                                Convertido: {goalMinutes} minutos
                            </p>
                        </div>
                    </div>
                    
                    {/* Campo Icon (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="icon" className="flex items-center gap-1 text-xs uppercase font-semibold text-zinc-400">
                            <Hash className="h-3 w-3" /> Ícone/Emoji (Ex: ⚛️)
                        </Label>
                        <Input 
                            id="icon" 
                            name="icon" 
                            placeholder="Ex: ⚛️ ou react-icon-name" 
                            value={icon} 
                            onChange={(e) => setIcon(e.target.value)}
                            autoComplete="off" 
                            className="h-10 bg-zinc-800 border-zinc-700 focus:border-indigo-500"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isEditing ? 'Salvar Alterações' : 'Adicionar ao Mapa'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}