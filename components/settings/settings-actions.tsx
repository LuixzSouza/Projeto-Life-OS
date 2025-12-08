"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restoreBackup, factoryReset } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";

export function RestoreBackupForm() {
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsUploading(true);
    try {
        await restoreBackup(formData);
        toast.success("Backup restaurado com sucesso!", {
            description: "Seus dados foram recarregados."
        });
        // Recarrega a página para atualizar os dados visuais
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        toast.error("Erro ao restaurar backup", {
            description: "Verifique se o arquivo .json é válido."
        });
        console.error(error);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <form action={handleSubmit} className="flex gap-2 items-center">
        <Input 
            type="file" 
            name="file" 
            accept=".json" 
            required 
            className="cursor-pointer" 
            disabled={isUploading}
        />
        <Button type="submit" disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Restaurando..." : "Restaurar"}
        </Button>
    </form>
  );
}

export function FactoryResetButton() {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleReset = async () => {
        // Confirmação dupla no navegador
        if (!confirm("TEM CERTEZA ABSOLUTA? Isso apagará TODOS os seus dados.")) return;
        if (!confirm("Último aviso: Esta ação é irreversível.")) return;

        setIsDeleting(true);
        try {
            await factoryReset();
            toast.success("Sistema resetado.", {
                description: "Todos os dados foram apagados."
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error("Erro ao resetar sistema.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-500">
                Isso irá apagar TODAS as tarefas, transações, treinos e estudos. O usuário será mantido.
            </p>
            <Button 
                type="button" 
                variant="destructive" 
                className="w-full sm:w-auto"
                onClick={handleReset}
                disabled={isDeleting}
            >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {isDeleting ? "Apagando..." : "Factory Reset (Apagar Tudo)"}
            </Button>
        </div>
    );
}