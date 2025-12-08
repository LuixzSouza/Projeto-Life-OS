import { prisma } from "@/lib/prisma";
import { updateProfile, factoryReset } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Monitor, ShieldAlert, Download } from "lucide-react";
import { ModeToggle } from "@/components/settings/mode-toggle"; // Vamos criar logo abaixo

export default async function SettingsPage() {
  const user = await prisma.user.findFirst();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        {/* ABA GERAL: PERFIL */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Perfil de Usuário</CardTitle>
              <CardDescription>Seus dados pessoais no Life OS.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome de Exibição</Label>
                  <Input name="name" defaultValue={user?.name} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>Email Principal</Label>
                  <Input name="email" defaultValue={user?.email} placeholder="email@exemplo.com" />
                </div>
                <Button>Salvar Alterações</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA APARÊNCIA: DARK MODE */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Tema</CardTitle>
              <CardDescription>Personalize a experiência visual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Modo Escuro / Claro</Label>
                  <p className="text-sm text-zinc-500">Alternar entre tema light e dark.</p>
                </div>
                <ModeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA SISTEMA: DADOS E RESET */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Exportar Dados</CardTitle>
              <CardDescription>Baixe um JSON com todas as suas informações.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Futuramente implementamos a rota de API para download */}
               <Button variant="outline">Baixar Backup Completo (.json)</Button>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-50/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600"><ShieldAlert className="h-5 w-5" /> Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis.</CardDescription>
            </CardHeader>
            <CardContent>
               <form action={factoryReset}>
                  <p className="text-sm text-zinc-500 mb-4">Isso irá apagar TODAS as tarefas, transações, treinos e estudos. O usuário será mantido.</p>
                  <Button variant="destructive" className="w-full sm:w-auto">Factory Reset (Apagar Tudo)</Button>
               </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}