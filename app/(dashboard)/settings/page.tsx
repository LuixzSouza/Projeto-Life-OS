import { prisma } from "@/lib/prisma";
import { getStorageStats } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Database, Upload, Shield, BrainCircuit, User } from "lucide-react";
import Link from "next/link";
import path from "path";

// Componentes
import { AppearanceLoader } from "@/components/settings/appearance-loader";
import { RestoreBackupForm, FactoryResetButton } from "@/components/settings/settings-actions";
// Importar os novos formulários refatorados
import { StorageAnalytics, AIConfigForm, SecurityForm, StorageLocationForm } from "@/components/settings/settings-forms"; 
import { getDatabasePath } from "@/lib/db-config";

export default async function SettingsPage() {
  const user = await prisma.user.findFirst();
  const settings = await prisma.settings.findFirst();
  const dbFullPath = getDatabasePath(); 
  const dbFolder = path.dirname(dbFullPath); // Mostra só a pasta na UI
  
  // Buscar estatísticas (Assumindo que a action retorna o formato correto para o novo componente)
  const stats = await getStorageStats();

  return (
    <div className="min-h-screen bg-zinc-50/30 dark:bg-black p-6 md:p-10 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Configurações</h1>
        <p className="text-zinc-500">Gerencie suas preferências, dados e segurança.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-8">
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <div className="overflow-x-auto pb-2">
            <TabsList className="bg-transparent h-12 p-0 gap-6 w-full justify-start min-w-max">
            <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 dark:data-[state=active]:border-white rounded-none px-0 pb-2 font-medium text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white flex items-center gap-2"
            >
                <User className="h-4 w-4" /> Perfil & Aparência
            </TabsTrigger>
            <TabsTrigger 
                value="intelligence" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 dark:data-[state=active]:border-white rounded-none px-0 pb-2 font-medium text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white flex items-center gap-2"
            >
                <BrainCircuit className="h-4 w-4" /> Inteligência Artificial
            </TabsTrigger>
            <TabsTrigger 
                value="system" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 dark:data-[state=active]:border-white rounded-none px-0 pb-2 font-medium text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white flex items-center gap-2"
            >
                <Database className="h-4 w-4" /> Dados & Backup
            </TabsTrigger>
            <TabsTrigger 
                value="security" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 dark:data-[state=active]:border-white rounded-none px-0 pb-2 font-medium text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white flex items-center gap-2"
            >
                <Shield className="h-4 w-4" /> Segurança
            </TabsTrigger>
            </TabsList>
        </div>

        {/* 1. PERFIL E VISUAL */}
        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Identidade</h3>
                    <p className="text-sm text-zinc-500">Como você aparece no sistema.</p>
                </div>
                <div className="md:col-span-8">
                    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <CardContent className="p-6">
                            {/* Componente que lida com Foto (Avatar) e Campos */}
                            <AppearanceLoader 
                                initialColor={settings?.accentColor} 
                                userName={user?.name} 
                                userEmail={user?.email} 
                                userAvatar={user?.avatarUrl} 
                                userBio={user?.bio}          
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        {/* 2. INTELIGÊNCIA ARTIFICIAL */}
        <TabsContent value="intelligence" className="space-y-6 focus-visible:outline-none">
             <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Cérebro Digital</h3>
                    <p className="text-sm text-zinc-500">Personalize o comportamento da IA.</p>
                </div>
                <div className="md:col-span-8">
                    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <CardContent className="p-6">
                            {/* Novo Form Refatorado */}
                            <AIConfigForm settings={settings} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        {/* 3. DADOS E SISTEMA */}
        <TabsContent value="system" className="space-y-8 focus-visible:outline-none">
             {/* Estatísticas */}
            <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Armazenamento</h3>
                    <p className="text-sm text-zinc-500">Gerencie o local físico e o uso do disco.</p>
                </div>
                <div className="md:col-span-8 space-y-6">
                    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <CardContent className="p-6">
                            {/* ✅ NOVO FORMULÁRIO AQUI */}
                            <StorageLocationForm currentPath={dbFolder} />
                            
                            <div className="my-6 h-px bg-zinc-100 dark:bg-zinc-800" />
                            
                            <StorageAnalytics stats={stats} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Backup e Restore */}
            <div className="grid gap-6 md:grid-cols-12 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="md:col-span-4">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Backup & Reset</h3>
                    <p className="text-sm text-zinc-500">Exporte seus dados ou reinicie o sistema.</p>
                </div>
                <div className="md:col-span-8 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
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

                        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Importar</CardTitle>
                                <CardDescription>Restaure dados de um arquivo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RestoreBackupForm />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-red-800 dark:text-red-400">Zona de Perigo</h4>
                                <p className="text-xs text-red-600 dark:text-red-300">Isso apaga todas as tarefas, eventos e finanças.</p>
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
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Acesso</h3>
                    <p className="text-sm text-zinc-500">Altere sua senha mestre.</p>
                </div>
                <div className="md:col-span-8">
                    {/* Novo Form Refatorado */}
                    <SecurityForm />
                </div>
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}