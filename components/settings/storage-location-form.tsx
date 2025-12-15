"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateStoragePath } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { HardDrive, FolderInput } from "lucide-react";
import { FolderPicker } from "@/components/settings/folder-picker";

export function StorageLocationForm({ currentPath }: { currentPath?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [pathValue, setPathValue] = useState(currentPath || "D:/LifeOS_Data");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set("storagePath", pathValue); 
        try {
            await updateStoragePath(formData);
            toast.success("Banco de dados movido com sucesso!", {
                description: "Reinicie a aplicação para garantir a integridade.",
                duration: 5000,
            });
        } catch (error) {
            toast.error("Caminho inválido ou sem permissão.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
                <form action={handleSubmit} className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-background rounded-xl shadow-sm text-primary border border-primary/20">
                            <HardDrive className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">Localização do Banco de Dados</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                                Você tem controle total. Escolha uma pasta no seu HD, SSD ou Pen Drive para armazenar o arquivo <code>life_os.db</code>.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2 pt-2">
                        <Label htmlFor="storagePath" className="text-xs font-semibold uppercase text-muted-foreground">Caminho Atual</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FolderInput className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input name="storagePath" value={pathValue} onChange={(e) => setPathValue(e.target.value)} placeholder="Ex: D:/MeusArquivos/LifeOS" className="pl-9 bg-background font-mono text-xs border-primary/20 focus-visible:ring-primary" />
                            </div>
                            
                            <FolderPicker currentPath={pathValue} onSelect={(newPath) => setPathValue(newPath)} />

                            <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" disabled={isLoading}>
                                {isLoading ? "Movendo..." : "Mover"}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}