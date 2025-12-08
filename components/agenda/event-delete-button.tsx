"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEvent } from "@/app/(dashboard)/agenda/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function EventDeleteButton({ eventId, eventTitle }: { eventId: string, eventTitle: string }) {
    
    const handleDeleteConfirmed = async () => {
        try {
            await deleteEvent(eventId);
            toast.success(`Evento "${eventTitle}" cancelado.`);
        } catch (error) {
            toast.error("Falha ao deletar evento.");
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o compromisso **{eventTitle}**? Esta ação é irreversível.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Não</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteConfirmed} 
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Sim, Cancelar Evento
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}