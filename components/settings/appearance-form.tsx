"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Camera, User, Mail, Image as ImageIcon, Loader2, Moon, Sun, Laptop, Upload, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useThemeColor } from "@/components/providers/theme-color-provider";

// Cores disponíveis
const colors = [
  { name: "theme-blue", label: "Azul", bg: "bg-blue-600" },
  { name: "theme-green", label: "Verde", bg: "bg-green-600" },
  { name: "theme-orange", label: "Laranja", bg: "bg-orange-500" },
  { name: "theme-violet", label: "Roxo", bg: "bg-violet-600" },
  { name: "theme-rose", label: "Rose", bg: "bg-rose-600" },
];

interface AppearanceFormProps {
  initialColor?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
  userBio?: string | null;
  userCover?: string | null;
}

export default function AppearanceForm({ 
  initialColor, 
  userName, 
  userEmail, 
  userAvatar, 
  userBio,
  userCover 
}: AppearanceFormProps) {
  const { setTheme, theme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor(); 
  
  // Estado de montagem para evitar Hydration Mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [isLoading, setIsLoading] = useState(false);

  // Refs para inputs de arquivo
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Estados locais para preview
  const [name, setName] = useState(userName || "");
  const [avatarUrl, setAvatarUrl] = useState(userAvatar || "");
  const [coverUrl, setCoverUrl] = useState(userCover || "");
  const [bio, setBio] = useState(userBio || "");

  // Processamento de Imagem (Preview Local)
  const handleImageProcess = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
        // Limite de 4MB para capa, 2MB para avatar
        const limit = isCover ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > limit) {
            toast.error(`A imagem é muito grande. Máximo de ${isCover ? '4MB' : '2MB'}.`);
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (isCover) setCoverUrl(reader.result as string);
            else setAvatarUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    formData.set("accentColor", themeColor);
    
    // Lógica de envio de imagens (Base64 ou URL existente)
    if (avatarUrl && avatarUrl.startsWith("data:")) formData.set("avatarUrl", avatarUrl);
    else if (!avatarUrl) formData.set("avatarUrl", ""); 

    if (coverUrl && coverUrl.startsWith("data:")) formData.set("coverUrl", coverUrl);
    else if (!coverUrl) formData.set("coverUrl", ""); 
    
    try {
        await updateSettings(formData);
        toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
        toast.error("Erro ao salvar configurações.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
        <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. CARTÃO DE IDENTIDADE (COM CAPA MELHORADA) */}
      <Card className="overflow-hidden border-border shadow-sm bg-card group/card">
        
        {/* --- ÁREA DA CAPA (BANNER) --- */}
        <div className="relative h-52 w-full overflow-hidden group/cover rounded-t-lg bg-muted">
            
            {/* Camada de Fundo (Imagem ou Gradiente Padrão) */}
            {coverUrl ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/cover:scale-105"
                    style={{ backgroundImage: `url(${coverUrl})` }}
                >
                     <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" /> {/* Overlay sutil */}
                </div>
            ) : (
                // Estado vazio: Gradiente baseado na cor do tema
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-muted/50 pattern-grid-white/10" />
            )}

            {/* Camada de Controles (Aparece no Hover) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-all duration-300 translate-y-2 group-hover/cover:translate-y-0">
                 {/* Botão Adicionar/Alterar */}
                 <Button 
                    type="button" variant="secondary" size="sm" 
                    className="bg-background/70 hover:bg-background/90 backdrop-blur-md shadow-sm h-9 px-3 text-xs font-medium border-0"
                    onClick={() => coverInputRef.current?.click()}
                 >
                    <ImageIcon className="h-3.5 w-3.5 mr-2 text-primary" /> 
                    {coverUrl ? "Alterar Capa" : "Adicionar Capa"}
                 </Button>

                 {/* Botão Remover (só aparece se tiver capa) */}
                 {coverUrl && (
                    <Button 
                        type="button" variant="destructive" size="icon" 
                        className="h-9 w-9 shadow-sm opacity-80 hover:opacity-100 backdrop-blur-md"
                        onClick={() => { 
                            setCoverUrl(""); 
                            if (coverInputRef.current) coverInputRef.current.value = ""; 
                        }}
                        title="Remover capa"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                 )}
            </div>
             
            {/* Input invisível para capa */}
            <input type="file" ref={coverInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageProcess(e, true)} />
            {/* Input invisível para avatar */}
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageProcess(e, false)} />
        </div>
        {/* --- FIM DA ÁREA DA CAPA --- */}


        <CardContent className="relative px-8 pb-10">
           {/* Avatar e Infos */}
           <div className="flex flex-col md:flex-row gap-8 -mt-20 items-start">
               
               {/* Avatar (Sobreposto à capa) */}
               <div className="flex flex-col items-center gap-3 shrink-0 relative z-10">
                    <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                        <Avatar className="h-36 w-36 border-[6px] border-card shadow-xl bg-muted">
                            <AvatarImage src={avatarUrl || ""} className="object-cover" />
                            <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                                {name.substring(0, 2).toUpperCase() || "EU"}
                            </AvatarFallback>
                        </Avatar>
                        
                        <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity border-[6px] border-transparent backdrop-blur-[1px]">
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Editar</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => avatarInputRef.current?.click()}>
                            <Upload className="h-3 w-3 mr-1" /> Foto
                        </Button>
                        {avatarUrl && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setAvatarUrl("")}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
               </div>

               {/* Campos de Texto */}
               <div className="flex-1 w-full pt-4 md:pt-20 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2 text-muted-foreground"><User className="h-3.5 w-3.5"/> Nome de Exibição</Label>
                            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 focus-visible:ring-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5"/> Email</Label>
                            <Input id="email" name="email" defaultValue={userEmail || ""} readOnly className="bg-muted/50 opacity-70 cursor-not-allowed border-dashed" />
                        </div>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="bio" className="text-muted-foreground">Bio / Objetivo</Label>
                         <Textarea id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted/30 min-h-[80px] resize-none focus-visible:ring-primary" placeholder="O que você está focando no momento?" />
                    </div>
               </div>
           </div>
        </CardContent>
      </Card>

      {/* 2. SEÇÃO DE CORES E TEMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card de Cores */}
          <Card className="border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle>Paleta de Cores</CardTitle>
              <CardDescription>A cor de destaque do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <div key={color.name} className={cn("cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-muted transition-all aspect-square justify-center relative group", themeColor === color.name ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30")} onClick={() => setThemeColor(color.name)} title={color.label}>
                      <div className={cn("h-6 w-6 rounded-full shadow-sm ring-2 ring-offset-2 ring-transparent transition-all group-hover:scale-110", color.bg)} />
                      {themeColor === color.name && (<div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 animate-in zoom-in"><Check className="h-2 w-2 text-primary-foreground" /></div>)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card de Tema */}
          <Card className="border-border shadow-sm bg-card">
              <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Modo claro, escuro ou automático.</CardDescription></CardHeader>
              <CardContent className="flex gap-2">
                  {[ { id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Laptop, label: 'Auto' } ].map((mode) => (
                      <div key={mode.id} onClick={() => setTheme(mode.id)} className={cn("flex-1 p-3 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2 transition-all hover:bg-muted", theme === mode.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground")}>
                          <mode.icon className={cn("h-5 w-5", theme === mode.id && "fill-primary/20")} />
                          <span className="text-xs font-medium">{mode.label}</span>
                      </div>
                  ))}
              </CardContent>
          </Card>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto shadow-lg transition-all hover:scale-[1.02] bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Salvando...</span>) : ("Salvar Alterações")}
        </Button>
      </div>
    </form>
  );
}