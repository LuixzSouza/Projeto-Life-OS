import { prisma } from "@/lib/prisma";
import { getStorageStats } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Shield, BrainCircuit, User, Plug, Wrench } from "lucide-react";
import path from "path";
import { cn } from "@/lib/utils";
import { getDatabasePath } from "@/lib/db-config";
import os from "os";
import { getCurrentUserId } from "@/lib/auth";
import { decryptSettings } from "@/lib/settings-crypto";

// --- Importação dos Componentes ---
import AppearanceForm from "@/components/settings/appearance-form"; 
import { FactoryResetButton, RestoreBackupForm } from "@/components/settings/settings-actions";
import { AIConfigForm } from "@/components/settings/ai-config-form";
import { StorageAnalytics } from "@/components/settings/storage-analytics";
import { SecurityForm } from "@/components/settings/security-form";
import { StorageLocationForm } from "@/components/settings/storage-location-form";
import APIIntegrationsForm from "@/components/settings/api-integrations-form";
import { BackupManager } from "@/components/settings/backup-manager";
import { SystemInfoCard } from "@/components/settings/system-info-card"; // ✅ Info do Sistema
import { MaintenancePanel } from "@/components/settings/maintenance-panel"; // ✅ Manutenção (VACUUM)
import { SelectiveExport } from "@/components/settings/selective-export"; // ✅ Exportação Seletiva

export default async function SettingsPage() {
    // 1. Busca Dados do Usuário logado
    const userId = await getCurrentUserId();
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    // Chaves vêm cifradas do banco; descriptografamos para exibir/editar nos forms.
    const settings = decryptSettings(
        userId ? await prisma.settings.findUnique({ where: { userId } }) : null
    );
    
    // 2. Resolve Caminho do Banco
    const rawDbPath = getDatabasePath();
    const dbFullPath = rawDbPath || path.join(process.cwd(), 'life_os.db'); 
    const dbFolder = path.dirname(dbFullPath);
    
    // 3. Histórico de Backups
    const backupHistory = await prisma.backupLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    // 4. Estatísticas de Armazenamento (Com Fallback Seguro)
    let stats;
    try {
        stats = await getStorageStats();
    } catch (e) {
        // Fallback corrigido para bater com a interface TypeScript
        stats = { 
            totalItems: 0, 
            totalSize: "0 B", 
            breakdown: [], 
            disk: null 
        };
    }

    // 5. Informações do Ambiente (Servidor)
    const systemInfo = {
        cwd: process.cwd(),
        platform: os.platform() + " " + os.release(),
        nodeVersion: process.version,
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
        uptime: Math.floor(process.uptime()) + "s"
    };

    return (
        <div className="min-h-screen bg-muted/30 p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            
            {/* HEADER DA PÁGINA */}
            <div className="flex flex-col gap-1 pb-6 border-b border-border">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
                <p className="text-muted-foreground">Gerencie suas preferências, dados e integrações.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full space-y-8">
                
                {/* BARRA DE NAVEGAÇÃO (TABS) */}
                <div className="overflow-x-auto pb-2">
                    <TabsList className="bg-transparent h-12 p-0 gap-6 w-full justify-start min-w-max">
                    {[
                        { value: "profile", icon: User, label: "Perfil & Aparência" },
                        { value: "intelligence", icon: BrainCircuit, label: "Inteligência Artificial" },
                        { value: "integrations", icon: Plug, label: "Integrações & APIs" }, 
                        { value: "system", icon: Database, label: "Dados & Sistema" },
                        { value: "security", icon: Shield, label: "Segurança" },
                    ].map((tab) => (
                        <TabsTrigger 
                            key={tab.value}
                            value={tab.value} 
                            className={cn(
                                "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                                "data-[state=active]:border-b-2 data-[state=active]:border-primary",
                                "rounded-none px-0 pb-2 font-medium text-muted-foreground",
                                "data-[state=active]:text-foreground flex items-center gap-2 transition-all"
                            )}
                        >
                            <tab.icon className="h-4 w-4" /> {tab.label}
                        </TabsTrigger>
                    ))}
                    </TabsList>
                </div>

                {/* === ABA 1: DADOS E SISTEMA (POWER USER) === */}
                <TabsContent value="system" className="space-y-8 focus-visible:outline-none">
                    
                    {/* A. Monitoramento e Localização */}
                    <div className="grid gap-6 md:grid-cols-12">
                        <div className="md:col-span-4 space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Ambiente</h3>
                                <p className="text-sm text-muted-foreground">Monitoramento do servidor e arquivos.</p>
                            </div>
                            <div className="h-auto pt-2">
                                <SystemInfoCard info={systemInfo} />
                            </div>
                        </div>

                        <div className="md:col-span-8 space-y-6">
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <StorageLocationForm currentPath={dbFolder} /> 
                                    <div className="my-6 h-px bg-border" />
                                    <StorageAnalytics stats={stats} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* B. Manutenção Técnica (VACUUM & CHECK) */}
                    <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                                <Wrench className="h-4 w-4" /> Manutenção
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Ferramentas para otimizar performance e verificar integridade.
                            </p>
                        </div>
                        <div className="md:col-span-8">
                            <MaintenancePanel />
                        </div>
                    </div>

                    {/* C. Snapshots (Backups Locais) */}
                    <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground">Snapshots</h3>
                            <p className="text-sm text-muted-foreground">
                                Pontos de restauração salvos automaticamente na pasta do sistema.
                            </p>
                        </div>
                        <div className="md:col-span-8">
                            <BackupManager history={backupHistory} />
                        </div>
                    </div>

                    {/* D. Migração (Exportar/Importar JSON) */}
                    <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground">Migração de Dados</h3>
                            <p className="text-sm text-muted-foreground">
                                Exporte partes específicas ou transfira dados via arquivo JSON.
                            </p>
                        </div>
                        <div className="md:col-span-8">
                            <div className="grid md:grid-cols-2 gap-4 h-full">
                                {/* Exportação Seletiva (Novo) */}
                                <SelectiveExport /> 
                                
                                {/* Importação */}
                                <Card className="border-border shadow-sm bg-card h-full">
                                    <CardContent className="p-6">
                                        <RestoreBackupForm /> 
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* E. Zona de Perigo */}
                    <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-destructive">Zona de Perigo</h3>
                        </div>
                        <div className="md:col-span-8">
                            <Card className="border border-destructive/30 bg-destructive/5">
                                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-destructive">Reset de Fábrica</h4>
                                        <p className="text-xs text-muted-foreground">Apaga TUDO. Irreversível.</p>
                                    </div>
                                    <FactoryResetButton />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* === ABA 2: PERFIL === */}
                <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
                    <AppearanceForm
                        initialColor={settings?.accentColor}
                        initialCurrency={settings?.currency}
                        initialPixKey={settings?.pixKey}
                        initialBusinessName={settings?.businessName}
                        userName={user?.name}
                        userEmail={user?.email} 
                        userAvatar={user?.avatarUrl} 
                        userBio={user?.bio} 
                        userCover={user?.coverUrl} 
                    />
                </TabsContent>

                {/* === ABA 3: INTELIGÊNCIA ARTIFICIAL === */}
                <TabsContent value="intelligence" className="space-y-6 focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground">Cérebro Digital</h3>
                            <p className="text-sm text-muted-foreground">Personalize o comportamento da IA.</p>
                        </div>
                        <div className="md:col-span-8">
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <AIConfigForm settings={settings} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* === ABA 4: INTEGRAÇÕES === */}
                <TabsContent value="integrations" className="space-y-6 focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground">Chaves de Serviço</h3>
                            <p className="text-sm text-muted-foreground">Conecte serviços externos.</p>
                        </div>
                        <div className="md:col-span-8">
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <APIIntegrationsForm settings={settings} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* === ABA 5: SEGURANÇA === */}
                <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <h3 className="text-lg font-medium text-foreground">Acesso</h3>
                            <p className="text-sm text-muted-foreground">Altere sua senha mestre.</p>
                        </div>
                        <div className="md:col-span-8">
                            <SecurityForm
                                initialAutoLock={settings?.autoLockMinutes ?? 15}
                                initialPrivacyMode={settings?.privacyMode ?? false}
                            />
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}