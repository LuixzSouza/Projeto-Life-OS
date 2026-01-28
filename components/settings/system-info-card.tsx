"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, Cpu, Box, Activity, Copy, Check, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SystemInfo {
    cwd: string;
    platform: string;
    nodeVersion: string;
    memory: string;
    uptime: string;
}

export function SystemInfoCard({ info }: { info: SystemInfo }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(info.cwd);
        setCopied(true);
        toast.success("Caminho copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border-border shadow-sm bg-card h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Status do Ambiente
                </CardTitle>
                <CardDescription className="text-xs truncate">
                    Informações do servidor Node.js.
                </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4 flex-1 space-y-5">
                
                {/* --- SEÇÃO DO CAMINHO (BLINDADA) --- */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Terminal className="h-3 w-3" /> Diretório (CWD)
                    </div>
                    
                    {/* O segredo para não quebrar: min-w-0 no pai flex */}
                    <div 
                        className="group flex items-center justify-between p-2 bg-muted/50 border border-border rounded-md cursor-pointer hover:bg-muted/80 transition-colors gap-2"
                        onClick={handleCopy}
                        title={info.cwd}
                    >
                        {/* truncate + min-w-0 impede que o texto empurre a caixa */}
                        <code className="text-xs font-mono text-foreground truncate min-w-0 flex-1">
                            {info.cwd}
                        </code>
                        
                        {/* shrink-0 impede que o ícone seja esmagado */}
                        <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </div>
                    </div>
                </div>

                {/* --- GRID DE DETALHES --- */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Memória */}
                    <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-semibold">
                            <Activity className="h-3 w-3" /> Memória
                        </p>
                        <p className="text-sm font-bold font-mono">{info.memory}</p>
                    </div>

                    {/* Node Version */}
                    <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-semibold">
                            <Box className="h-3 w-3" /> Node
                        </p>
                        <p className="text-sm font-bold font-mono">{info.nodeVersion}</p>
                    </div>

                    {/* OS */}
                    <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1 col-span-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-semibold">
                            <Cpu className="h-3 w-3" /> Sistema Operacional
                        </p>
                        <p className="text-xs font-medium capitalize truncate" title={info.platform}>
                            {info.platform}
                        </p>
                    </div>
                </div>

                {/* --- FOOTER STATUS --- */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">Online</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" />
                        UP: {info.uptime}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}