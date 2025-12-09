"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, // <--- CORREÇÃO: Usar este título para o Alerta
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff, ExternalLink, Pencil, Trash2, Key, ShieldCheck, Hash, Lock, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { deleteAccess, revealPassword } from "@/app/(dashboard)/access/actions"; 
import { AccessForm } from "./access-form";
import { cn } from "@/lib/utils";

// Mapeamento de ícones
const CategoryIcons = {
    FINANCE: { icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" },
    SOCIAL: { icon: Hash, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" },
    WORK: { icon: Lock, color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800" },
    OTHERS: { icon: Key, color: "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700" },
};

export function AccessCard({ item }: { item: AccessItem }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);
    const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const categoryStyle = CategoryIcons[item.category as keyof typeof CategoryIcons] || CategoryIcons.OTHERS;
    const Icon = categoryStyle.icon;

    const handleToggleVisibility = async () => {
        if (isVisible) {
            setIsVisible(false);
            return;
        }
        if (decryptedPassword) {
            setIsVisible(true);
            return;
        }

        setIsLoadingPassword(true);
        try {
            const password = await revealPassword(item.id);
            setDecryptedPassword(password);
            setIsVisible(true);
        } catch (error) {
            toast.error("Erro ao descriptografar senha.");
        } finally {
            setIsLoadingPassword(false);
        }
    };

    const copyToClipboard = (text: string | null, label: string) => {
        if (!text) {
            if (label === "Senha" && !isVisible) {
                toast.info("Revele a senha primeiro para copiar.");
            } else {
                toast.error("Nada para copiar.");
            }
            return;
        }
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    const handleDelete = async () => {
        await deleteAccess(item.id);
        toast.success("Item removido do cofre.");
    };

    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg bg-white dark:bg-zinc-900 h-full flex flex-col">
            <CardContent className="p-5 flex flex-col h-full">
                
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn("p-2.5 rounded-xl border shrink-0 transition-colors", categoryStyle.color)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-base" title={item.title}>
                                {item.title}
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono truncate cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors" 
                               onClick={() => copyToClipboard(item.username, "Usuário")}
                               title="Clique para copiar usuário">
                                {item.username || "Sem usuário"}
                            </p>
                        </div>
                    </div>

                    {/* Ações (Editar/Excluir) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Editar Acesso</DialogTitle>
                                </DialogHeader>
                                <AccessForm item={item} onClose={() => setIsEditOpen(false)} />
                            </DialogContent>
                        </Dialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    {/* CORREÇÃO AQUI: AlertDialogTitle em vez de DialogTitle */}
                                    <AlertDialogTitle>Excluir do Cofre?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja apagar os dados de <strong>{item.title}</strong>? Essa ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sim, Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Área da Senha (O COFRE) */}
                <div className="relative group/pass">
                    <div className="absolute inset-0 bg-zinc-100/50 dark:bg-zinc-800/20 rounded-lg pointer-events-none" />
                    <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2 shadow-sm transition-colors group-hover/pass:border-zinc-300 dark:group-hover/pass:border-zinc-700">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[9px] text-zinc-400 uppercase font-bold mb-0.5 tracking-widest">Senha</p>
                            <div className="font-mono text-sm truncate h-5 flex items-center text-zinc-800 dark:text-zinc-200">
                                {isLoadingPassword ? (
                                    <div className="flex items-center gap-2 text-indigo-500 text-xs">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Descriptografando...
                                    </div>
                                ) : isVisible ? (
                                    <span className="select-all">{decryptedPassword}</span>
                                ) : (
                                    <span className="text-zinc-400 tracking-widest text-lg leading-none mt-1">••••••••</span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                onClick={handleToggleVisibility}
                                title={isVisible ? "Esconder" : "Revelar"}
                            >
                                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                onClick={() => {
                                    if (isVisible && decryptedPassword) {
                                        copyToClipboard(decryptedPassword, "Senha");
                                    } else {
                                        // Auto-revelar e copiar
                                        handleToggleVisibility().then(() => {
                                            // Nota: O estado update é assíncrono, então o copy pode falhar na primeira tentativa se não usarmos o retorno.
                                            // Melhor UX: Pedir para revelar primeiro ou confiar na ação seguinte.
                                            if(!isVisible) toast.info("Senha revelada. Clique novamente para copiar.");
                                        });
                                    }
                                }}
                                title="Copiar Senha"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Rodapé do Card (Links e Notas) */}
                <div className="mt-auto pt-4 flex gap-2">
                    {item.url && (
                        <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noreferrer" className="flex-1">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-2 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800">
                                <Globe className="h-3 w-3" /> Acessar
                            </Button>
                        </a>
                    )}
                    {item.username && (
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="flex-1 text-xs h-8 gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            onClick={() => copyToClipboard(item.username, "Usuário")}
                        >
                            <Copy className="h-3 w-3" /> User
                        </Button>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}