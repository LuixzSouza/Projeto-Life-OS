"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Usando componente shadcn se disponível
import { Check, Camera, User, Mail, Sparkles, Image as ImageIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  userAvatar?: string | null;
  userBio?: string | null;
}

export default function AppearanceForm({ initialColor, userName, userEmail, userAvatar, userBio }: AppearanceFormProps) {
  const { setTheme, theme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(initialColor || "theme-blue");
  
  // Estados locais para preview em tempo real
  const [name, setName] = useState(userName || "");
  const [avatarUrl, setAvatarUrl] = useState(userAvatar || "");
  
  // URL segura para preview (se vazia, usa gerador)
  const safeAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`;

  const handleSubmit = async (formData: FormData) => {
    formData.append("accentColor", selectedColor);
    
    const promise = updateSettings(formData);

    toast.promise(promise, {
      loading: 'Atualizando perfil...',
      success: () => {
        // Pequeno delay para o usuário ver o toast antes do reload (opcional)
        setTimeout(() => window.location.reload(), 800); 
        return 'Perfil atualizado com sucesso!';
      },
      error: 'Erro ao salvar configurações.',
    });
  };

  return (
    <form action={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      
      {/* 1. SEÇÃO DE IDENTIDADE (REFORMULADA) */}
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        
        {/* Banner Decorativo (Fake Cover) */}
        <div className="h-32 w-full bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 relative group">
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/5 backdrop-blur-[2px] cursor-pointer">
                <span className="text-xs font-medium flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <ImageIcon className="h-4 w-4" /> Alterar Capa (Em breve)
                </span>
            </div>
        </div>

        <CardHeader className="pb-4 relative">
            {/* Avatar Flutuante sobre o Banner */}
            <div className="absolute -top-12 left-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-950 shadow-lg cursor-pointer transition-transform hover:scale-105">
                        <AvatarImage src={safeAvatar} className="object-cover" />
                        <AvatarFallback className="text-2xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {name.substring(0, 2).toUpperCase() || "EU"}
                        </AvatarFallback>
                    </Avatar>
                    {/* Badge de Edição */}
                    <div className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 rounded-full text-white shadow-md border-2 border-white dark:border-zinc-950 group-hover:bg-indigo-500 transition-colors">
                        <Camera className="h-3 w-3" />
                    </div>
                </div>
            </div>

            <div className="ml-32 mt-2">
                <CardTitle className="text-xl">Seu Perfil Público</CardTitle>
                <CardDescription>Como você aparece para o sistema e amigos.</CardDescription>
            </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lado Esquerdo: Informações Básicas */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-zinc-500" /> Nome de Exibição
                        </Label>
                        <Input 
                            id="name"
                            name="name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Como você quer ser chamado?"
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-zinc-500" /> Email (Login)
                        </Label>
                        <Input 
                            id="email"
                            name="email" 
                            defaultValue={userEmail || ""} 
                            placeholder="seu@email.com"
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>
                </div>

                {/* Lado Direito: Detalhes Visuais */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-500" /> URL da Imagem de Perfil
                        </Label>
                        <Input 
                            id="avatarUrl"
                            name="avatarUrl" 
                            value={avatarUrl} 
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://github.com/seu-usuario.png"
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                        />
                        <p className="text-[10px] text-zinc-500">
                            Deixe vazio para usar um avatar gerado automaticamente com suas iniciais.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio / Status</Label>
                        <Input 
                            id="bio"
                            name="bio" 
                            defaultValue={userBio || ""} 
                            placeholder="Ex: Focando em produtividade..." 
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" 
                        />
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 2. SEÇÃO DE CORES E TEMA (LADO A LADO EM TELAS GRANDES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Paleta de Cores</CardTitle>
              <CardDescription>A cor de destaque dos botões e links.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <div 
                      key={color.name} 
                      className={cn(
                          "cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all aspect-square justify-center",
                          selectedColor === color.name ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-transparent bg-zinc-50/50 dark:bg-zinc-900/50"
                      )}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.label}
                  >
                      <div className={`h-6 w-6 rounded-full ${color.bg} shadow-sm flex items-center justify-center`}>
                          {selectedColor === color.name && <Check className="text-white h-3 w-3" />}
                      </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
              <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Escolha entre claro, escuro ou automático.</CardDescription></CardHeader>
              <CardContent className="flex gap-2">
                  <div 
                      onClick={() => setTheme("light")}
                      className={cn(
                          "flex-1 p-3 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          theme === 'light' ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : "border-zinc-100 dark:border-zinc-800"
                      )}
                  >
                      <div className="h-12 w-full bg-white border rounded shadow-sm"></div>
                      <span className="text-xs font-medium">Claro</span>
                  </div>
                  <div 
                      onClick={() => setTheme("dark")}
                      className={cn(
                          "flex-1 p-3 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          theme === 'dark' ? "border-indigo-500 bg-zinc-900" : "border-zinc-100 dark:border-zinc-800"
                      )}
                  >
                      <div className="h-12 w-full bg-zinc-950 border border-zinc-800 rounded shadow-sm"></div>
                      <span className="text-xs font-medium">Escuro</span>
                  </div>
                  <div 
                      onClick={() => setTheme("system")}
                      className={cn(
                          "flex-1 p-3 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          theme === 'system' ? "border-indigo-500" : "border-zinc-100 dark:border-zinc-800"
                      )}
                  >
                      <div className="h-12 w-full bg-gradient-to-r from-white to-zinc-950 border rounded shadow-sm"></div>
                      <span className="text-xs font-medium">Auto</span>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button type="submit" size="lg" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all hover:scale-[1.02]">
            Salvar Alterações
        </Button>
      </div>
    </form>
  );
}