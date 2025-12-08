"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

const colors = [
  { name: "theme-blue", label: "Azul (Padrão)", bg: "bg-blue-600" },
  { name: "theme-green", label: "Verde Foco", bg: "bg-green-600" },
  { name: "theme-orange", label: "Laranja Energia", bg: "bg-orange-600" },
  { name: "theme-violet", label: "Roxo Criativo", bg: "bg-violet-600" },
  { name: "theme-rose", label: "Rose Elegante", bg: "bg-rose-600" },
];

interface AppearanceFormProps {
  initialColor?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null; // Novo
  userBio?: string | null;    // Novo
}

// 1. Componente limpo, sem useEffect de montagem
export default function AppearanceForm({ initialColor, userName, userEmail, userAvatar, userBio }: AppearanceFormProps) {
  const { setTheme, theme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(initialColor || "theme-blue");

  const handleSubmit = async (formData: FormData) => {
    formData.append("accentColor", selectedColor);
    
    const promise = updateSettings(formData);

    toast.promise(promise, {
      loading: 'Salvando preferências...',
      success: () => {
        setTimeout(() => window.location.reload(), 1000);
        return 'Configurações salvas com sucesso!';
      },
      error: 'Erro ao salvar configurações.',
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-6">
        
        {/* Seção de Perfil Rápido */}
        <Card>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Como você aparece no Life OS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex flex-col md:flex-row gap-6">
                
                {/* Preview do Avatar */}
                <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={userAvatar || ""} />
                        <AvatarFallback className="text-2xl font-bold">
                            {userName?.substring(0, 2).toUpperCase() || "EU"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-zinc-500">Preview</span>
                </div>

                {/* Campos */}
                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <input name="name" defaultValue={userName || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <input name="email" defaultValue={userEmail || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>URL do Avatar (Link de imagem)</Label>
                        <input 
                            name="avatarUrl" 
                            defaultValue={userAvatar || ""} 
                            placeholder="https://github.com/seu-usuario.png"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        />
                        <p className="text-[10px] text-zinc-500">Dica: Use o link da sua foto do GitHub ou LinkedIn.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Bio / Status</Label>
                        <input name="bio" defaultValue={userBio || ""} placeholder="Ex: Focando em React..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Seção de Cores */}
        <Card>
          <CardHeader>
            <CardTitle>Paleta de Cores</CardTitle>
            <CardDescription>Escolha a cor de destaque do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {colors.map((color) => (
                <div 
                    key={color.name} 
                    className={cn(
                        "cursor-pointer rounded-lg border-2 p-1 flex flex-col items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all",
                        selectedColor === color.name ? "border-primary bg-zinc-50 dark:bg-zinc-900" : "border-transparent"
                    )}
                    onClick={() => setSelectedColor(color.name)}
                >
                    <div className={`h-10 w-10 rounded-full ${color.bg} shadow-sm flex items-center justify-center`}>
                        {selectedColor === color.name && <Check className="text-white h-5 w-5" />}
                    </div>
                    <span className="text-xs font-medium text-center">{color.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seção de Modo (Claro/Escuro) */}
        <Card>
            <CardHeader><CardTitle>Modo de Exibição</CardTitle></CardHeader>
            <CardContent className="flex gap-4">
                <div 
                    onClick={() => setTheme("light")}
                    className={cn(
                        "flex-1 p-4 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2",
                        theme === 'light' ? "border-primary bg-zinc-50" : "border-zinc-200"
                    )}
                >
                    <div className="h-20 w-full bg-white border rounded shadow-sm"></div>
                    <span className="text-sm font-medium">Claro</span>
                </div>
                <div 
                    onClick={() => setTheme("dark")}
                    className={cn(
                        "flex-1 p-4 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2",
                        theme === 'dark' ? "border-primary bg-zinc-900" : "border-zinc-800"
                    )}
                >
                    <div className="h-20 w-full bg-zinc-950 border border-zinc-800 rounded shadow-sm"></div>
                    <span className="text-sm font-medium">Escuro</span>
                </div>
                <div 
                    onClick={() => setTheme("system")}
                    className={cn(
                        "flex-1 p-4 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2",
                        theme === 'system' ? "border-primary" : "border-zinc-200 dark:border-zinc-800"
                    )}
                >
                    <div className="h-20 w-full bg-gradient-to-r from-white to-zinc-950 border rounded shadow-sm"></div>
                    <span className="text-sm font-medium">Sistema</span>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" className="w-full md:w-auto">Salvar Personalização</Button>
      </div>
    </form>
  );
}