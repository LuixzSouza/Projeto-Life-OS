"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restoreBackup, factoryReset } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Upload, AlertTriangle, Loader2, Trash2, FileJson, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================================
// 1. FORMULÁRIO DE RESTAURAÇÃO (UPLOAD)
// ============================================================================
export function RestoreBackupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (formData: FormData) => {
    const file = formData.get("file") as File;
    
    if (!file || file.size === 0) {
      toast.error("Por favor, selecione um arquivo JSON válido.");
      return;
    }

    setIsLoading(true);
    try {
      await restoreBackup(formData);
      toast.success("Sistema restaurado com sucesso! A página será recarregada.");
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao restaurar backup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleUpload} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="backup-file" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Selecione o arquivo (.json)
        </Label>
        
        {/* Custom File Input Styling */}
        <div className="relative group">
            <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/20 rounded-lg group-hover:border-primary/40 transition-colors" />
            <div className="relative flex items-center gap-3 p-3">
                <div className="bg-background p-2 rounded-md shadow-sm border border-border">
                    <FileJson className="h-5 w-5 text-primary" />
                </div>
                <Input 
                    ref={fileInputRef}
                    id="backup-file" 
                    name="file" 
                    type="file" 
                    accept=".json" 
                    disabled={isLoading}
                    className="flex-1 cursor-pointer file:cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
                />
            </div>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full shadow-sm transition-all active:scale-[0.98]"
        disabled={isLoading}
      >
        {isLoading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restaurando...
            </>
        ) : (
            <>
                <Upload className="mr-2 h-4 w-4" /> Iniciar Restauração
            </>
        )}
      </Button>
      
      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Atenção: Isso substituirá todos os seus dados atuais.
      </p>
    </form>
  );
}

// ============================================================================
// 2. BOTÃO DE RESET DE FÁBRICA (ZONA DE PERIGO)
// ============================================================================
export function FactoryResetButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        setIsLoading(true);
        try {
            await factoryReset();
            toast.success("Sistema resetado para o padrão de fábrica.");
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            toast.error("Erro ao resetar o sistema.");
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="destructive" 
                    className="bg-background text-destructive border border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-colors shadow-sm" 
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Apagar Tudo
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive/20">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl">
                        <AlertTriangle className="h-6 w-6" /> Ação Irreversível
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 pt-2 text-base text-muted-foreground">
                        <p>
                            Você tem certeza absoluta? Esta ação apagará <strong>permanentemente</strong> todos os seus dados do banco de dados local:
                        </p>
                        <ul className="list-disc list-inside bg-destructive/5 p-3 rounded-lg text-destructive font-medium text-sm space-y-1 border border-destructive/10">
                            <li>Projetos e Tarefas</li>
                            <li>Transações Financeiras</li>
                            <li>Histórico de Estudos e IA</li>
                            <li>Configurações Personalizadas</li>
                        </ul>
                        <p>
                            Seus dados não poderão ser recuperados a menos que você tenha feito um backup manual antes.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel disabled={isLoading}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault();
                            handleReset();
                        }}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Apagando...</span>
                        ) : (
                            "Sim, apagar tudo"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}