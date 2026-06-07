"use client";

import { useState } from "react";
import { optimizeDatabase, checkDatabaseIntegrity } from "@/app/(dashboard)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
    Hammer, 
    Stethoscope, 
    Activity,
    CheckCircle2, 
    AlertOctagon,
    Loader2,
    BowArrowIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DbMode = "local" | "cloud" | "replica" | null;

export function MaintenancePanel({ mode = "local" }: { mode?: DbMode }) {
    const [optimizing, setOptimizing] = useState(false);
    const [checking, setChecking] = useState(false);
    const [healthStatus, setHealthStatus] = useState<"unknown" | "healthy" | "error">("unknown");

    // VACUUM só faz sentido no Local (arquivo real). No Híbrido/Nuvem o Turso cuida.
    const canOptimize = mode === "local";
    // Diagnóstico de arquivo: Local e Híbrido (lê o arquivo); na Nuvem não se aplica.
    const canCheck = mode === "local" || mode === "replica";

    const handleOptimize = async () => {
        setOptimizing(true);
        const res = await optimizeDatabase();
        setOptimizing(false);
        
        if (res.success) toast.success("Sucesso", { description: res.message });
        else toast.error("Erro", { description: res.message });
    };

    const handleCheck = async () => {
        setChecking(true);
        const res = await checkDatabaseIntegrity();
        setChecking(false);

        if (res.success) {
            setHealthStatus("healthy");
            toast.success("Diagnóstico concluído", { description: res.message });
        } else {
            setHealthStatus("error");
            toast.error("Atenção", { description: res.message });
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {/* Otimização */}
            <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BowArrowIcon className="h-4 w-4 text-primary" />
                        Limpeza & Performance
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Execute o <code>VACUUM</code> para liberar espaço inutilizado e reindexar dados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between group hover:border-primary/50"
                        onClick={handleOptimize}
                        disabled={optimizing || !canOptimize}
                    >
                        <span className="flex items-center gap-2">
                            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hammer className="h-3.5 w-3.5" />}
                            Otimizar Banco
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 bg-muted group-hover:bg-background">
                            Recomendado mensalmente
                        </Badge>
                    </Button>
                    {!canOptimize && (
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                            Indisponível no modo {mode === "replica" ? "Híbrido" : "Nuvem"} — o Turso
                            otimiza o banco automaticamente.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Integridade */}
            <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Diagnóstico de Saúde
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Verifica se há corrupção no arquivo <code>life_os.db</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 justify-start gap-2"
                            onClick={handleCheck}
                            disabled={checking || !canCheck}
                        >
                            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                            Rodar Diagnóstico
                        </Button>
                        
                        {healthStatus === "healthy" && (
                            <div className="flex items-center gap-1.5 px-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md text-xs font-medium animate-in fade-in">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Saudável
                            </div>
                        )}
                        {healthStatus === "error" && (
                            <div className="flex items-center gap-1.5 px-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-md text-xs font-medium animate-in fade-in">
                                <AlertOctagon className="h-3.5 w-3.5" /> Erro
                            </div>
                        )}
                    </div>
                    {!canCheck && (
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                            Indisponível no modo Nuvem — a integridade é gerenciada pelo Turso.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}