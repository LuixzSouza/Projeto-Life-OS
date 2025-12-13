"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
    Folder, 
    FolderOpen, 
    HardDrive, 
    Check, 
    ChevronRight, 
    ArrowUp, 
    Home, 
    Monitor,
    AlertCircle
} from "lucide-react";
import { listDirectories } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FolderPickerProps {
    onSelect: (path: string) => void;
    currentPath: string;
}

export function FolderPicker({ onSelect, currentPath }: FolderPickerProps) {
    const [open, setOpen] = useState(false);
    
    // Estado local para navegação
    const [browsingPath, setBrowsingPath] = useState(currentPath);
    const [folders, setFolders] = useState<{name: string, path: string, type?: string}[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ CORREÇÃO: Definimos a função ANTES de usar no useEffect
    // Usamos useCallback para garantir que ela não seja recriada a cada render
    const loadFolders = useCallback(async (path: string) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await listDirectories(path);
            
            if (result.success && result.directories) {
                setFolders(result.directories);
                // Se retornou um path válido (e não é a lista de drives "ROOT"), atualiza o input
                if (result.path && !result.isRoot) {
                    setBrowsingPath(result.path);
                } else if (result.isRoot) {
                    setBrowsingPath("Este Computador");
                }
            } else {
                setError(result.error || "Erro desconhecido");
                // Não limpamos o path para o usuário poder corrigir se digitou errado
            }
        } catch (e) {
            setError("Erro de conexão com o sistema de arquivos.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Efeito para carregar quando abre
    useEffect(() => {
        if (open) {
            // Se o caminho atual parecer inválido ou vazio, começa na Home ou Root
            loadFolders(browsingPath || "ROOT");
        }
    }, [open, loadFolders]); // Removemos browsingPath das dependências para evitar loop infinito

    const handleSelect = () => {
        if (browsingPath === "Este Computador") {
            toast.error("Por favor, selecione uma pasta específica, não a lista de discos.");
            return;
        }
        onSelect(browsingPath);
        setOpen(false);
    };

    const handleGoUp = () => {
        if (browsingPath === "Este Computador") return;
        
        // Lógica simples para subir um nível
        // Se estiver em C:\, vai para "ROOT" (lista de discos)
        if (browsingPath.match(/^[a-zA-Z]:\\?$/)) {
            loadFolders("ROOT");
            return;
        }
        
        // Pega o diretório pai (funciona em Windows e Linux)
        // ex: C:\Users\Luiz -> C:\Users
        const separator = browsingPath.includes("\\") ? "\\" : "/";
        const parts = browsingPath.split(separator).filter(Boolean);
        parts.pop(); // Remove a última pasta
        
        const newPath = parts.join(separator) + (separator === "\\" && parts.length === 1 ? "\\" : ""); // Mantém a barra se for raiz (C:\)
        
        // Se ficou vazio, vai para ROOT
        if (!newPath) {
            loadFolders("ROOT");
        } else {
            loadFolders(newPath);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 bg-zinc-50 dark:bg-zinc-800" title="Navegar nas pastas">
                    <FolderOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                        <HardDrive className="h-5 w-5 text-indigo-500" /> Explorador de Arquivos
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    {/* Barra de Navegação */}
                    <div className="flex gap-2 items-center">
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={() => loadFolders("ROOT")} title="Este Computador / Discos">
                                <Monitor className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => loadFolders("")} title="Pasta do Usuário (Home)">
                                <Home className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleGoUp} title="Subir Nível">
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 relative">
                            <Input 
                                value={browsingPath} 
                                onChange={(e) => setBrowsingPath(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadFolders(browsingPath)}
                                className="pr-16 font-mono text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            />
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="absolute right-1 top-1 h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => loadFolders(browsingPath)}
                            >
                                Ir
                            </Button>
                        </div>
                    </div>

                    {/* Área de Lista */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden relative min-h-[300px] bg-zinc-50/30 dark:bg-zinc-900/30">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium text-indigo-600">Lendo disco...</span>
                                </div>
                            </div>
                        )}

                        <ScrollArea className="h-[300px]">
                            <div className="p-2 space-y-1">
                                {error && (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-red-500 gap-2">
                                        <AlertCircle className="h-8 w-8 opacity-50" />
                                        <p className="text-sm">{error}</p>
                                        <Button variant="outline" size="sm" onClick={handleGoUp} className="mt-2">Voltar</Button>
                                    </div>
                                )}

                                {!error && folders.map((folder) => (
                                    <button
                                        key={folder.path}
                                        onClick={() => loadFolders(folder.path)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                                    >
                                        {/* Ícone diferente para Disco ou Pasta */}
                                        {folder.type === 'drive' ? (
                                            <HardDrive className="h-5 w-5 text-zinc-500 group-hover:text-indigo-600" />
                                        ) : (
                                            <Folder className="h-5 w-5 text-indigo-300 fill-indigo-100 dark:text-indigo-700 dark:fill-indigo-900/50 group-hover:text-indigo-500" />
                                        )}
                                        
                                        <span className="text-sm truncate flex-1 text-zinc-700 dark:text-zinc-300 font-medium">
                                            {folder.name}
                                        </span>
                                        
                                        <ChevronRight className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                                
                                {!error && !isLoading && folders.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                                        <FolderOpen className="h-10 w-10 mb-2 opacity-20" />
                                        <p className="text-xs">Pasta vazia</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <p className="text-[10px] text-zinc-400">
                            SQLite requer permissão de escrita na pasta.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSelect} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105">
                                <Check className="h-4 w-4 mr-2" /> Selecionar Esta Pasta
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}