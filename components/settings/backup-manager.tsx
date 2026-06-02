"use client";

import { useState } from "react";
import { BackupLog } from "@prisma/client";
import { createLocalBackup, restoreBackup, deleteBackup } from "@/app/(dashboard)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { 
    ArchiveRestore, 
    HardDriveDownload, 
    RotateCcw, 
    Trash2, 
    FileClock, 
    Loader2,
    DatabaseBackup,
    AlertTriangle
} from "lucide-react";
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

export function BackupManager({ history }: { history: BackupLog[] }) {
    const [isCreating, setIsCreating] = useState(false);
    
    // Estados de Controle
    const [backupToRestore, setBackupToRestore] = useState<BackupLog | null>(null);
    const [backupToDelete, setBackupToDelete] = useState<BackupLog | null>(null);

    // --- 1. CRIAR ---
    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const res = await createLocalBackup();
            if (res.success) toast.success(res.message);
            else toast.error(res.message);
        } catch {
            toast.error("Erro ao criar snapshot.");
        } finally {
            setIsCreating(false);
        }
    };

    // --- 2. RESTAURAR ---
    const executeRestore = async () => {
        if (!backupToRestore) return;
        
        const toastId = toast.loading("Restaurando banco de dados...");
        try {
            const res = await restoreBackup(backupToRestore.id);
            if (res.success) {
                toast.success("Sucesso! O sistema será reiniciado.", { id: toastId });
                setBackupToRestore(null);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error(res.message, { id: toastId });
            }
        } catch {
            toast.error("Erro crítico na restauração.", { id: toastId });
        }
    };

    // --- 3. EXCLUIR ---
    const executeDelete = async () => {
        if (!backupToDelete) return;

        try {
            const res = await deleteBackup(backupToDelete.id);
            if (res.success) toast.success("Snapshot removido.");
            else toast.error("Erro ao remover.");
        } catch {
            toast.error("Erro ao tentar excluir.");
        } finally {
            setBackupToDelete(null); 
        }
    };

    return (
        <>
            <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ArchiveRestore className="h-4 w-4 text-primary" />
                                Snapshots & Histórico
                            </CardTitle>
                            <CardDescription>
                                Backups locais salvos em <code>/backups</code>.
                            </CardDescription>
                        </div>
                        <Button 
                            onClick={handleCreate} 
                            disabled={isCreating} 
                            size="sm" 
                            className="gap-2 bg-primary hover:bg-primary/90 shadow-sm"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
                            Criar Snapshot
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b border-border/50 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5 md:col-span-4 pl-2">Data / Arquivo</div>
                        <div className="col-span-2 hidden md:block">Tamanho</div>
                        <div className="col-span-4 md:col-span-3">ID</div>
                        <div className="col-span-3 text-right pr-2">Ações</div>
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                                <div className="p-4 rounded-full bg-muted/50">
                                    <DatabaseBackup className="h-8 w-8 opacity-20" />
                                </div>
                                <p className="text-sm">Nenhum backup encontrado.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {history.map((backup) => (
                                    <div key={backup.id} className="p-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-muted/40 transition-colors group">
                                        <div className="col-span-5 md:col-span-4 flex flex-col pl-2">
                                            <div className="flex items-center gap-2">
                                                <FileClock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                <span className="font-medium text-foreground truncate">
                                                    {formatDate(backup.createdAt)}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono truncate pl-6">
                                                {formatTime(backup.createdAt)}
                                            </span>
                                        </div>

                                        <div className="col-span-2 hidden md:flex items-center">
                                            <Badge variant="outline" className="text-[10px] font-mono h-5 border-border/60 bg-background">
                                                {backup.size}
                                            </Badge>
                                        </div>

                                        <div className="col-span-4 md:col-span-3 flex items-center">
                                            <code className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded truncate max-w-full" title={backup.fileName}>
                                                {backup.fileName}
                                            </code>
                                        </div>

                                        <div className="col-span-3 flex justify-end gap-1 pr-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 w-8 p-0 text-primary border-primary/20 hover:bg-primary/10"
                                                onClick={() => setBackupToRestore(backup)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setBackupToDelete(backup)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* AQUI ESTÁ A CORREÇÃO:
               Adicionei classes 'z-[9999]' e 'fixed' para forçar o modal a ficar 
               no topo e no centro, independente de onde ele foi renderizado.
            */}

            {/* MODAL RESTAURAR */}
            <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
                <AlertDialogContent className="z-[9999] fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Confirmar Restauração
                        </AlertDialogTitle>
                        <div className="space-y-3 pt-2">
                            <p className="text-sm text-muted-foreground">
                                Você vai voltar o sistema para o estado de:
                            </p>
                            <div className="bg-muted p-3 rounded-md text-sm font-mono border">
                                {backupToRestore?.fileName}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                    {backupToRestore && formatDateTime(backupToRestore.createdAt)}
                                </span>
                            </div>
                            <p className="text-xs text-red-500 font-medium">
                                ⚠️ Atenção: Todos os dados criados APÓS essa data serão apagados permanentemente.
                            </p>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeRestore} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                            Sim, Restaurar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MODAL EXCLUIR */}
            <AlertDialog open={!!backupToDelete} onOpenChange={(open) => !open && setBackupToDelete(null)}>
                <AlertDialogContent className="z-[9999] fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apagar Snapshot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O arquivo <strong>{backupToDelete?.fileName}</strong> será removido do disco. 
                            <br/>Esta ação é irreversível.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Apagar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}