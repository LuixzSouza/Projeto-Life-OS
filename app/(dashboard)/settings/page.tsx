// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getStorageStats, getDbStatus } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Database, Shield, BrainCircuit, User, Plug, Wrench } from "lucide-react";
import path from "path";
import fs from "fs";
import { cn } from "@/lib/utils";
import { getDatabasePath, getDbProfile, maskDbUrl, isRegistrationOpen } from "@/lib/db-config";
import os from "os";
import { headers } from "next/headers";
import { getCurrentUserId } from "@/lib/auth";
import { decryptSettings } from "@/lib/settings-crypto";
import { makeCalendarToken } from "@/lib/ical";

// --- Importação dos Componentes ---
import AppearanceForm from "@/components/settings/appearance-form"; 
import { FactoryResetButton, RestoreBackupForm } from "@/components/settings/settings-actions";
import { AIConfigForm } from "@/components/settings/ai-config-form";
import { StorageAnalytics } from "@/components/settings/storage-analytics";
import { SecurityForm } from "@/components/settings/security-form";
import { StorageLocationForm } from "@/components/settings/storage-location-form";
import { DbSyncCard } from "@/components/settings/db-sync-card";
import { MigrateToReplicaCard } from "@/components/settings/migrate-to-replica-card";
import APIIntegrationsForm from "@/components/settings/api-integrations-form";
import { BackupManager } from "@/components/settings/backup-manager";
import { AutoBackupCard } from "@/components/settings/auto-backup-card"; // ✅ Backup automático diário
import { getAutoBackupStatus } from "@/lib/auto-backup";
import { SystemInfoCard } from "@/components/settings/system-info-card"; // ✅ Info do Sistema
import { MaintenancePanel } from "@/components/settings/maintenance-panel"; // ✅ Manutenção (VACUUM)
import { SelectiveExport } from "@/components/settings/selective-export"; // ✅ Exportação Seletiva
import { SelectiveDelete } from "@/components/settings/selective-delete"; // ✅ Exclusão Seletiva
import { AiMemoriesCard } from "@/components/settings/ai-memories-card"; // ✅ Memórias da IA
import { AiAutomationsCard } from "@/components/settings/ai-automations-card"; // ✅ Automações da IA
import { AiPrivacyCard } from "@/components/settings/ai-privacy-card"; // ✅ Privacidade/Web da IA
import { RemoteAccessCard } from "@/components/settings/remote-access-card"; // ✅ Acesso pelo celular
import { listAiMemories } from "./actions/ai-memories";
import { listAiAutomations } from "./actions/ai-automations";
import { getWindowsIntegrationStatus } from "./actions/windows-integration";
import { AccessLogCard, describeUserAgent, type AccessLogEntry } from "@/components/settings/access-log-card";
import { SessionsCard } from "@/components/settings/sessions-card"; // ✅ Desconectar outros dispositivos
import { DbOverviewCard, type DbOverview } from "@/components/settings/db-overview-card"; // ✅ Card "Seu banco"
import { MigrateDbCard } from "@/components/settings/migrate-db-card"; // ✅ Mudar de banco (Fase 3)
import { SpaceOptimizerCard } from "@/components/settings/space-optimizer-card"; // ✅ Otimizar espaço (plano grátis)

const SETTINGS_TABS = ["profile", "intelligence", "integrations", "system", "security"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    // 0. Aba inicial via URL (?tab=integrations) — permite deep-link de outras telas
    const { tab } = await searchParams;
    const initialTab: SettingsTab = SETTINGS_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "profile";

    // 1. Busca Dados do Usuário logado
    const userId = await getCurrentUserId();

    // 1b. Tudo que só depende do userId vai num ÚNICO lote paralelo
    // (Performance §1 do DATABASE_ROADMAP: em banco remoto cada await
    // sequencial custa 20–150ms — eram ~8 viagens em série nesta página).
    const [
        user,
        rawSettings,
        dbStatus,
        [aiMemories, aiAutomations],
        backupHistory,
        autoBackupStatus,
        stats,
        rawAccessLogs,
    ] = await Promise.all([
        userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
        userId ? prisma.settings.findUnique({ where: { userId } }) : null,
        getDbStatus(),
        userId
            ? Promise.all([listAiMemories(), listAiAutomations()])
            : Promise.resolve<[Awaited<ReturnType<typeof listAiMemories>>, Awaited<ReturnType<typeof listAiAutomations>>]>([[], []]),
        prisma.backupLog.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
        userId ? getAutoBackupStatus(userId) : null,
        // Fallback seguro: estatística que falha não derruba a página.
        getStorageStats().catch(() => ({
            totalItems: 0,
            totalSize: "0 B",
            breakdown: [],
            disk: null,
        })),
        userId
            ? prisma.activityLog.findMany({
                  where: { userId, module: "auth" },
                  orderBy: { createdAt: "desc" },
                  take: 10,
              })
            : [],
    ]);

    // Chaves vêm cifradas do banco; descriptografamos para exibir/editar nos forms.
    const settings = decryptSettings(rawSettings);

    // 2. Resolve Caminho do Banco
    const rawDbPath = getDatabasePath();
    const dbFullPath = rawDbPath || path.join(process.cwd(), 'life_os.db');
    const dbFolder = path.dirname(dbFullPath);

    // 2b-2. Card "Seu banco": identidade do provedor (latência vem do getDbStatus).
    const dbProfile = getDbProfile();
    const CLOUD_LABELS: Record<string, string> = {
        turso: "Turso", postgres: "PostgreSQL", supabase: "Supabase",
        mysql: "MySQL", mongodb: "MongoDB",
    };
    const dbProviderLabel =
        dbProfile?.mode === "local" ? "SQLite local"
        : dbProfile?.mode === "replica" ? "Réplica local + Turso"
        : dbProfile?.mode === "cloud" ? (CLOUD_LABELS[dbProfile.provider] ?? dbProfile.provider)
        : "Não configurado";
    const dbLocation =
        dbProfile?.mode === "cloud" ? maskDbUrl(dbProfile.url)
        : dbProfile?.mode === "replica" ? `${dbProfile.databasePath} ⇄ ${maskDbUrl(dbProfile.syncUrl)}`
        : dbProfile?.mode === "local" ? dbProfile.databasePath
        : null;
    
    // 4b. Endereços de rede local p/ acesso pelo celular (só faz sentido fora da nuvem).
    // A porta vem do header Host da própria requisição (cobre launcher em 3000..3011).
    const requestHost = (await headers()).get("host") ?? "localhost:3000";
    const serverPort = requestHost.includes(":") ? requestHost.split(":").pop()! : "80";
    // Prioriza IPs de rede local DOMÉSTICA (192.168/10/172.16-31) — adaptadores
    // de VPN virtual (Radmin/Hamachi 25-26.x, Tailscale 100.64+) entram por
    // último: o celular na mesma rede Wi-Fi não os alcança, e o QR usa o 1º da lista.
    const lanPriority = (ip: string): number => {
        if (/^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 0;
        return 1; // VPNs virtuais e faixas não-domésticas
    };
    const lanUrls = dbStatus.mode === "cloud" ? [] : Object.values(os.networkInterfaces())
        .flatMap((list) => list ?? [])
        .filter((iface) => iface.family === "IPv4" && !iface.internal)
        .sort((a, b) => lanPriority(a.address) - lanPriority(b.address))
        .map((iface) => `http://${iface.address}:${serverPort}`);

    // 4c. Integração com o Windows (iniciar com o sistema / firewall)
    const windowsIntegration = userId && dbStatus.mode !== "cloud"
        ? await getWindowsIntegrationStatus()
        : null;

    // 4c-2. Feed iCal da Agenda (token assinado; gira junto com o tokenVersion)
    const calendarToken = userId && user ? makeCalendarToken(userId, user.tokenVersion) : null;

    // 4d. Últimos acessos (aba Segurança) — linhas vieram no lote paralelo.
    const accessLogs: AccessLogEntry[] = rawAccessLogs.map((log) => {
        let ip = "?";
        let device = "Desconhecido";
        try {
            const meta = JSON.parse(log.meta ?? "{}") as { ip?: string; userAgent?: string };
            ip = meta.ip ?? "?";
            device = describeUserAgent(meta.userAgent ?? "");
        } catch { /* meta antiga/ausente */ }
        return { id: log.id, action: log.action, ip, device, createdAt: log.createdAt.toISOString() };
    });

    // 5. Informações do Ambiente (Servidor) — inclui a versão do app ("Sobre")
    let appVersion = "?";
    try {
        const pkg = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
        ) as { version?: string };
        appVersion = pkg.version ?? "?";
    } catch { /* build instalado pode não ter package.json acessível */ }

    const systemInfo = {
        cwd: process.cwd(),
        platform: os.platform() + " " + os.release(),
        nodeVersion: process.version,
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
        uptime: Math.floor(process.uptime()) + "s",
        version: appVersion
    };

    // 6. Card "Seu banco" — consolida a identidade/saúde do banco num lugar só.
    const dbOverview: DbOverview = {
        mode: dbStatus.mode,
        providerLabel: dbProviderLabel,
        location: dbLocation,
        latencyMs: dbStatus.latencyMs,
        sizeBytes: dbStatus.sizeBytes,
        sizeLimitBytes: dbStatus.sizeLimitBytes,
        lastSyncAt: dbStatus.lastSyncAt,
        lastSyncError: dbStatus.lastSyncError,
        lastBackupAt: backupHistory[0]?.createdAt.toISOString() ?? null,
    };

    return (
        <div className="min-h-screen bg-muted/30 p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            
            {/* HEADER DA PÁGINA */}
            <div className="flex flex-col gap-1 pb-6 border-b border-border">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
                <p className="text-muted-foreground">Gerencie suas preferências, dados e integrações.</p>
            </div>

            <SettingsTabs defaultValue={initialTab} className="w-full space-y-8">
                
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
                            {/* Card "Seu banco" — válido p/ qualquer modo/provedor (Turso,
                                Postgres, Supabase, local, réplica). */}
                            <DbOverviewCard overview={dbOverview} />
                            {dbStatus.isReplica && (
                                <DbSyncCard
                                    syncUrl={dbStatus.syncUrl}
                                    databasePath={dbStatus.databasePath}
                                    lastSyncAt={dbStatus.lastSyncAt}
                                    lastSyncError={dbStatus.lastSyncError}
                                />
                            )}
                            {dbStatus.mode === "local" && <MigrateToReplicaCard />}
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    {dbStatus.mode !== "cloud" && (
                                        <>
                                            <StorageLocationForm currentPath={dbFolder} />
                                            <div className="my-6 h-px bg-border" />
                                        </>
                                    )}
                                    <StorageAnalytics stats={stats} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* A2. Acesso Remoto (celular na rede local / fora de casa) */}
                    {dbStatus.mode !== "cloud" && (
                        <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                            <div className="md:col-span-4">
                                <h3 className="text-lg font-medium text-foreground">Acesso Remoto</h3>
                                <p className="text-sm text-muted-foreground">
                                    Use o Life OS no celular mantendo os dados no seu computador.
                                </p>
                            </div>
                            <div className="md:col-span-8">
                                <RemoteAccessCard lanUrls={lanUrls} mode={dbStatus.mode ?? "local"} windows={windowsIntegration} calendarToken={calendarToken} />
                            </div>
                        </div>
                    )}

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
                        <div className="md:col-span-8 space-y-4">
                            {/* Otimizador de espaço: recompressão de imagens + faxina
                                seletiva — essencial p/ render o plano grátis. */}
                            <SpaceOptimizerCard />
                            <MaintenancePanel mode={dbStatus.mode} />
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
                        <div className="md:col-span-8 space-y-4">
                            {autoBackupStatus && <AutoBackupCard initial={autoBackupStatus} />}
                            <BackupManager history={backupHistory} mode={dbStatus.mode} />
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
                        <div className="md:col-span-8 space-y-4">
                            {/* Mudar de banco (Fase 3): copia a instância inteira p/ outro
                                provedor e troca o perfil — banco antigo intacto. */}
                            <MigrateDbCard />
                            <div className="grid md:grid-cols-2 gap-4">
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
                            <p className="text-sm text-muted-foreground">
                                Apague conjuntos específicos de dados ou zere o sistema inteiro.
                            </p>
                        </div>
                        <div className="md:col-span-8 space-y-4">
                            {/* Exclusão seletiva por módulo */}
                            <SelectiveDelete />

                            {/* Reset total */}
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
                        initialLanguage={settings?.language}
                        initialWorkStart={settings?.workStart}
                        initialWorkEnd={settings?.workEnd}
                        initialReminderLead={settings?.reminderLeadMinutes}
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
                        <div className="md:col-span-8 space-y-6">
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <AIConfigForm settings={settings} />
                                </CardContent>
                            </Card>
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <AiMemoriesCard initialMemories={aiMemories} />
                                </CardContent>
                            </Card>
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <AiAutomationsCard initialAutomations={aiAutomations} />
                                </CardContent>
                            </Card>
                            <Card className="border-border shadow-sm bg-card">
                                <CardContent className="p-6">
                                    <AiPrivacyCard
                                        initial={{
                                            aiWebAccess: settings?.aiWebAccess ?? false,
                                            aiPrivacyRouting: settings?.aiPrivacyRouting ?? false,
                                            aiCostRouting: settings?.aiCostRouting ?? false,
                                        }}
                                    />
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
                        <div className="md:col-span-8 space-y-6">
                            <SecurityForm
                                initialAutoLock={settings?.autoLockMinutes ?? 15}
                                initialPrivacyMode={settings?.privacyMode ?? false}
                                initialRegistrationOpen={isRegistrationOpen()}
                            />
                            <SessionsCard />
                            <AccessLogCard entries={accessLogs} />
                        </div>
                    </div>
                </TabsContent>

            </SettingsTabs>
        </div>
    );
}