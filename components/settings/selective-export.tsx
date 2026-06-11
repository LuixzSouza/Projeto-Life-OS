"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Cópia de UI dos módulos do backup v3 (lib/full-backup.ts é server-only).
const MODULES = [
    { id: "tasks", label: "Projetos & Tarefas" },
    { id: "finance", label: "Finanças" },
    { id: "crm", label: "Negócios & Clientes" },
    { id: "connections", label: "Conexões" },
    { id: "agenda", label: "Agenda & Rotinas" },
    { id: "studies", label: "Estudos & Flashcards" },
    { id: "health", label: "Saúde & Treinos" },
    { id: "ai", label: "IA (conversas e memórias)" },
    { id: "vault", label: "Cofre de Acessos" },
    { id: "links", label: "Links Salvos" },
    { id: "entertainment", label: "Entretenimento" },
    { id: "wardrobe", label: "Closet" },
    { id: "sites", label: "Sites Gerenciados" },
    { id: "system", label: "Configurações & Sistema" },
];

export function SelectiveExport() {
    const [selected, setSelected] = useState<string[]>(MODULES.map((m) => m.id));
    const [isLoading, setIsLoading] = useState(false);

    const toggle = (id: string) => {
        setSelected(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleExport = async () => {
        if (selected.length === 0) return toast.error("Selecione pelo menos um módulo.");
        
        setIsLoading(true);
        try {
            // Chama a API passando os módulos selecionados via query param
            const params = new URLSearchParams();
            params.set("modules", selected.join(","));
            
            // Redireciona para a rota de API para forçar o download
            window.open(`/api/backup?${params.toString()}`, "_blank");
            
            toast.success("Download iniciado!");
        } catch {
            toast.error("Erro ao exportar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-border shadow-sm bg-card h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" /> Exportação Avançada
                </CardTitle>
                <CardDescription>
                    Escolha exatamente quais dados você deseja extrair do sistema.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MODULES.map((mod) => (
                        <div key={mod.id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <Checkbox 
                                id={mod.id} 
                                checked={selected.includes(mod.id)}
                                onCheckedChange={() => toggle(mod.id)}
                            />
                            <Label htmlFor={mod.id} className="text-xs cursor-pointer flex-1">
                                {mod.label}
                            </Label>
                        </div>
                    ))}
                </div>
                
                <Button 
                    className="w-full gap-2" 
                    variant="secondary"
                    onClick={handleExport}
                    disabled={isLoading || selected.length === 0}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                    Baixar Seleção (.json)
                </Button>
            </CardContent>
        </Card>
    );
}