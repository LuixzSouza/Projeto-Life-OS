"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function DeleteDialog({ onConfirm }: { onConfirm: () => Promise<void> }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 border-border/60"><Trash2 className="h-4.5 w-4.5" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">Remover registro?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">
                        Esta ação removerá permanentemente o registro do seu pipeline de carreira.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
