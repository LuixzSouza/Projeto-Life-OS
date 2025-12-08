import { prisma } from "@/lib/prisma";
import { getStorageStats } from "./actions"; // Importe a nova função
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Database, Upload, ShieldCheck, BrainCircuit } from "lucide-react";
import Link from "next/link";

// Componentes
import { AppearanceLoader } from "@/components/settings/appearance-loader";
import { RestoreBackupForm, FactoryResetButton } from "@/components/settings/settings-actions";
import { StorageAnalytics, AIConfigForm, SecurityForm } from "@/components/settings/settings-ui"; // <--- Novos

export default async function SettingsPage() {
  const user = await prisma.user.findFirst();
  const settings = await prisma.settings.findFirst();
  
  // Busca estatísticas reais do banco (Optimized)
  const stats = await getStorageStats();

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold">Painel de Controle</h1>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="appearance">Visual</TabsTrigger>
          <TabsTrigger value="intelligence">IA</TabsTrigger>
          <TabsTrigger value="system">Dados</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        {/* 1. VISUAL (Perfil e Cores) */}
        <TabsContent value="appearance" className="space-y-4">
            <AppearanceLoader 
                initialColor={settings?.accentColor} 
                userName={user?.name} 
                userEmail={user?.email} 
                userAvatar={user?.avatarUrl} 
                userBio={user?.bio}          
            />
        </TabsContent>

        {/* 2. INTELIGÊNCIA ARTIFICIAL (Novo) */}
        <TabsContent value="intelligence" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-purple-500" /> Configuração do Cérebro</CardTitle>
                    <CardDescription>Defina como a IA deve pensar e responder.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AIConfigForm settings={settings} />
                </CardContent>
            </Card>
        </TabsContent>

        {/* 3. SISTEMA & DADOS (Melhorado) */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
              {/* Analytics Visual */}
              <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Distribuição de Dados</CardTitle>
                    <CardDescription>Onde seu espaço está sendo usado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StorageAnalytics stats={stats} />
                </CardContent>
              </Card>

              {/* Exportar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Backup</CardTitle>
                  <CardDescription>Salve seus dados.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Link href="/api/backup" target="_blank">
                      <Button variant="outline" className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Exportar JSON
                      </Button>
                   </Link>
                </CardContent>
              </Card>

              {/* Importar */}
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Restaurar</CardTitle>
                    <CardDescription>Carregue um backup.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RestoreBackupForm />
                </CardContent>
              </Card>
          </div>

          <Card className="border-red-500/20 bg-red-50/10 mt-6">
             <CardContent className="pt-6">
                <FactoryResetButton />
             </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SEGURANÇA (Novo) */}
        <TabsContent value="security" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" /> Credenciais</CardTitle>
                    <CardDescription>Gerencie o acesso ao seu Life OS.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SecurityForm />
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}