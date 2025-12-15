import { prisma } from "@/lib/prisma";
import { getStorageStats } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Database, Upload, Shield, BrainCircuit, User } from "lucide-react";
import Link from "next/link";
import path from "path";
import { cn } from "@/lib/utils";
import { getDatabasePath } from "@/lib/db-config";

// 1. IMPORTAR OS COMPONENTES NOVOS (INDIVIDUALMENTE)
import AppearanceForm from "@/components/settings/appearance-form"; 
import { RestoreBackupForm, FactoryResetButton } from "@/components/settings/settings-actions";
import { AIConfigForm } from "@/components/settings/ai-config-form";
import { StorageAnalytics } from "@/components/settings/storage-analytics";
import { SecurityForm } from "@/components/settings/security-form";
import { StorageLocationForm } from "@/components/settings/storage-location-form";

export default async function SettingsPage() {
  // Busca de Dados do Servidor
  const user = await prisma.user.findFirst();
  const settings = await prisma.settings.findFirst();
  
  const dbFullPath = getDatabasePath(); 
  const dbFolder = path.dirname(dbFullPath);
  
  // Se a action retornar erro, usamos um fallback para não quebrar a página
  let stats;
  try {
      stats = await getStorageStats();
  } catch (e) {
      stats = { totalItems: 0, breakdown: [] };
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1 pb-6 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências, dados e segurança.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-8">
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <div className="overflow-x-auto pb-2">
            <TabsList className="bg-transparent h-12 p-0 gap-6 w-full justify-start min-w-max">
            {[
                { value: "profile", icon: User, label: "Perfil & Aparência" },
                { value: "intelligence", icon: BrainCircuit, label: "Inteligência Artificial" },
                { value: "system", icon: Database, label: "Dados & Backup" },
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

        {/* 1. PERFIL E VISUAL */}
        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
            <AppearanceForm 
                initialColor={settings?.accentColor} 
                userName={user?.name} 
                userEmail={user?.email} 
                userAvatar={user?.avatarUrl} 
                userBio={user?.bio}
                userCover={user?.coverUrl}
            />
        </TabsContent>

        {/* 2. INTELIGÊNCIA ARTIFICIAL */}
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

        {/* 3. DADOS E SISTEMA */}
        <TabsContent value="system" className="space-y-8 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-foreground">Armazenamento</h3>
                    <p className="text-sm text-muted-foreground">Gerencie o local físico e o uso do disco.</p>
                </div>
                <div className="md:col-span-8 space-y-6">
                    <Card className="border-border shadow-sm bg-card">
                        <CardContent className="p-6">
                            {/* Formulário de Localização */}
                            <StorageLocationForm currentPath={dbFolder} />
                            
                            <div className="my-6 h-px bg-border" />
                            
                            {/* Visualizador de Dados */}
                            <StorageAnalytics stats={stats} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Backup e Restore */}
            <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-border">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-foreground">Backup & Reset</h3>
                    <p className="text-sm text-muted-foreground">Exporte seus dados ou reinicie o sistema.</p>
                </div>
                <div className="md:col-span-8 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-border shadow-sm bg-card">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Exportar</CardTitle>
                                <CardDescription>Baixe um arquivo JSON com tudo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/api/backup" target="_blank">
                                    <Button variant="outline" className="w-full">Download Backup</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="border-border shadow-sm bg-card">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Importar</CardTitle>
                                <CardDescription>Restaure dados de um arquivo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RestoreBackupForm />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border border-destructive/30 bg-destructive/5">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-destructive">Zona de Perigo</h4>
                                <p className="text-xs text-muted-foreground">Isso apaga todas as tarefas, eventos e finanças.</p>
                            </div>
                            <FactoryResetButton />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        {/* 4. SEGURANÇA */}
        <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
             <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-foreground">Acesso</h3>
                    <p className="text-sm text-muted-foreground">Altere sua senha mestre.</p>
                </div>
                <div className="md:col-span-8">
                    <SecurityForm />
                </div>
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}