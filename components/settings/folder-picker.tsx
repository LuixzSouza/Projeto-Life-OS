"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
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
    AlertCircle,
    Database,
    Plug
} from "lucide-react";
import { listDirectories, checkPathAccess } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";

interface DirItem { name: string; path: string; type?: string; }

interface FolderPickerProps {
    onSelect: (path: string) => void;
    currentPath: string;
}

export function FolderPicker({ onSelect, currentPath }: FolderPickerProps) {
    const [open, setOpen] = useState(false);

    const [browsingPath, setBrowsingPath] = useState(currentPath);
    const [folders, setFolders] = useState<DirItem[]>([]);
    const [dbFiles, setDbFiles] = useState<DirItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFolders = useCallback(async (path: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await listDirectories(path);

            if (result.success) {
                setFolders(result.directories);
                setDbFiles(result.files);
                if (result.path && !result.isRoot) {
                    setBrowsingPath(result.path);
                } else if (result.isRoot) {
                    setBrowsingPath("Este Computador");
                }
                // Aviso suave quando o caminho pedido não existia e caímos no fallback.
                if (result.notice) {
                    toast.info(result.notice);
                }
            } else {
                setError(result.error || "Erro desconhecido");
            }
        } catch (e) {
            setError("Erro de conexão com o sistema de arquivos.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Intencional: recarrega a listagem apenas ao ABRIR o diálogo, usando o
        // browsingPath daquele instante. Incluí-lo nas deps recarregaria a cada
        // navegação de pasta, anulando a navegação do usuário.
        if (open) {
            loadFolders(browsingPath || "ROOT");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, loadFolders]);

    // Verifica permissão/acesso do alvo (pasta ou arquivo) ANTES de confirmar.
    const verifyAndSelect = async (target: string) => {
        if (target === "Este Computador") {
            toast.error("Por favor, selecione uma pasta específica.");
            return;
        }
        setVerifying(true);
        try {
            const res = await checkPathAccess(target);
            if (!res.ok) {
                toast.error(res.message);
                return;
            }
            toast.success(res.message);
            onSelect(target);
            setOpen(false);
        } catch {
            toast.error("Não foi possível verificar o acesso a este local.");
        } finally {
            setVerifying(false);
        }
    };

    const handleSelect = () => verifyAndSelect(browsingPath);
    // Seleciona um arquivo .db existente (conecta a ele em vez de criar um novo).
    const handleSelectFile = (filePath: string) => verifyAndSelect(filePath);

    const handleGoUp = () => {
        if (browsingPath === "Este Computador") return;
        
        if (browsingPath.match(/^[a-zA-Z]:\\?$/)) {
            loadFolders("ROOT");
            return;
        }
        
        const separator = browsingPath.includes("\\") ? "\\" : "/";
        const parts = browsingPath.split(separator).filter(Boolean);
        parts.pop(); 
        
        const newPath = parts.join(separator) + (separator === "\\" && parts.length === 1 ? "\\" : ""); 
        
        if (!newPath) {
            loadFolders("ROOT");
        } else {
            loadFolders(newPath);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 bg-secondary hover:bg-secondary/80 border-border" title="Navegar nas pastas" aria-label="Navegar nas pastas">
                    <FolderOpen className="h-4 w-4 text-primary" />
                </Button>
            </DialogTrigger>
            <DialogContent size="lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <HardDrive className="h-5 w-5 text-primary" /> Explorador de Arquivos
                    </DialogTitle>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {/* Barra de Navegação */}
                    <div className="flex gap-2 items-center">
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={() => loadFolders("ROOT")} title="Este Computador" aria-label="Este computador" className="text-muted-foreground hover:text-foreground">
                                <Monitor className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => loadFolders("")} title="Pasta do Usuário" aria-label="Pasta do usuário" className="text-muted-foreground hover:text-foreground">
                                <Home className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleGoUp} title="Subir Nível" aria-label="Subir um nível" className="text-muted-foreground hover:text-foreground">
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 relative">
                            <Input 
                                value={browsingPath} 
                                onChange={(e) => setBrowsingPath(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadFolders(browsingPath)}
                                className="pr-16 font-mono text-xs bg-muted/50 border-border focus-visible:ring-primary"
                            />
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="absolute right-1 top-1 h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => loadFolders(browsingPath)}
                            >
                                Ir
                            </Button>
                        </div>
                    </div>

                    {/* Área de Lista */}
                    <div className="border border-border rounded-lg overflow-hidden relative min-h-[300px] bg-muted/20">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium text-primary">Lendo disco...</span>
                                </div>
                            </div>
                        )}

                        <ScrollArea className="h-[300px]">
                            <div className="p-2 space-y-1">
                                {error && (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-destructive gap-2">
                                        <AlertCircle className="h-8 w-8 opacity-50" />
                                        <p className="text-sm">{error}</p>
                                        <Button variant="outline" size="sm" onClick={handleGoUp} className="mt-2">Voltar</Button>
                                    </div>
                                )}

                                {/* Bancos existentes (.db) — conectar em vez de criar */}
                                {!error && dbFiles.length > 0 && (
                                    <div className="mb-2">
                                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">
                                            Bancos encontrados aqui
                                        </p>
                                        {dbFiles.map((file) => (
                                            <button
                                                key={file.path}
                                                onClick={() => handleSelectFile(file.path)}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-all group border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 mb-1"
                                                title="Conectar a este banco existente"
                                            >
                                                <Database className="h-5 w-5 text-emerald-500 shrink-0" />
                                                <span className="text-sm truncate flex-1 text-foreground font-medium">{file.name}</span>
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Plug className="h-3.5 w-3.5" /> Conectar
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!error && folders.map((folder) => (
                                    <button
                                        key={folder.path}
                                        onClick={() => loadFolders(folder.path)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-all group border border-transparent hover:bg-primary/10 hover:border-primary/20"
                                    >
                                        {folder.type === 'drive' ? (
                                            <HardDrive className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                        ) : (
                                            // Ícone de pasta adaptável ao tema
                                            <Folder className="h-5 w-5 text-primary/40 fill-primary/10 group-hover:text-primary group-hover:fill-primary/20" />
                                        )}

                                        <span className="text-sm truncate flex-1 text-foreground font-medium">
                                            {folder.name}
                                        </span>

                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}

                                {!error && !isLoading && folders.length === 0 && dbFiles.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <FolderOpen className="h-10 w-10 mb-2 opacity-20" />
                                        <p className="text-xs">Pasta vazia</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogBody>

                <DialogFooter className="sm:justify-between">
                    <p className="text-[10px] text-muted-foreground max-w-[260px]">
                        Clique num <span className="text-emerald-600 font-medium">banco (.db)</span> para conectar,
                        ou escolha uma pasta para criar um novo. Requer permissão de escrita.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={verifying}>Cancelar</Button>
                        <Button onClick={handleSelect} disabled={verifying} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                            {verifying ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Verificando…
                                </span>
                            ) : (
                                <><Check className="h-4 w-4 mr-2" /> Usar esta pasta</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}