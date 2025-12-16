"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Camera, User, Mail, Image as ImageIcon, Loader2, Moon, Sun, Laptop, Upload, Trash2, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useThemeColor } from "@/components/providers/theme-color-provider";

// --- 1. FUNÇÃO HEX PARA HSL (Corrigida para retornar hsl(...)) ---
function hexToHsl(hex: string): { h: number; s: number; l: number; cssValue: string } {
  // Remove o hash se existir
  const cleanHex = hex.replace(/^#/, '');

  // Converte para RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let h = 0;
  let s = 0;
  
  // FIX ESLINT: 'l' nunca é reatribuído, então é const
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = (h * 360).toFixed(1);
  const sPct = (s * 100).toFixed(1);
  const lPct = (l * 100).toFixed(1);

  // Retorna objeto com valores separados e string CSS COMPLETA com hsl()
  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
    cssValue: `hsl(${hDeg} ${sPct}% ${lPct}%)` 
  };
}

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
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [isLoading, setIsLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(userName || "");
  const [avatarUrl, setAvatarUrl] = useState(userAvatar || "");
  const [coverUrl, setCoverUrl] = useState(userCover || "");
  const [bio, setBio] = useState(userBio || "");

  const isPreset = colors.some(c => c.name === themeColor);
  
  // Estado da cor customizada
  const [customColorInput, setCustomColorInput] = useState(!isPreset && themeColor ? themeColor : "#000000");

  // --- 2. EFEITO: APLICAÇÃO DINÂMICA COMPATÍVEL COM SEU CSS ---
  useEffect(() => {
    const root = document.documentElement;

    if (!isPreset && themeColor && themeColor.startsWith('#')) {
        // Converte a cor escolhida
        const { l, cssValue } = hexToHsl(themeColor);
        
        // 1. Aplica a Cor Primária (já com hsl() em volta)
        root.style.setProperty('--primary', cssValue);
        root.style.setProperty('--ring', cssValue);

        // 2. Cálculo Inteligente de Contraste (Texto do Botão)
        // Também envolvemos em hsl() para garantir compatibilidade
        if (l > 60) {
            root.style.setProperty('--primary-foreground', 'hsl(222.2 47.4% 11.2%)'); // Escuro
        } else {
            root.style.setProperty('--primary-foreground', 'hsl(210 40% 98%)'); // Claro
        }
    } else {
        // Limpeza: Remove as inline styles para o CSS da classe (theme-blue, etc) assumir
        root.style.removeProperty('--primary');
        root.style.removeProperty('--ring');
        root.style.removeProperty('--primary-foreground');
    }
  }, [themeColor, isPreset]);

  const handleImageProcess = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleColorChange = (color: string) => {
      setThemeColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setCustomColorInput(hex);
      setThemeColor(hex); 
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    formData.set("accentColor", themeColor);
    
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
      
      {/* 1. CARTÃO DE IDENTIDADE */}
      <Card className="overflow-hidden border-border shadow-sm bg-card group/card">
        <div className="relative h-52 w-full overflow-hidden group/cover rounded-t-lg bg-muted">
            {coverUrl ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/cover:scale-105"
                    style={{ backgroundImage: `url(${coverUrl})` }}
                >
                     <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" />
                </div>
            ) : (
                <div 
                    className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-muted/50 pattern-grid-white/10" 
                    // FIX: Tipagem correta para CSS Properties
                    style={!isPreset ? ({ '--primary': hexToHsl(customColorInput).cssValue } as React.CSSProperties) : undefined}
                />
            )}

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-all duration-300 translate-y-2 group-hover/cover:translate-y-0">
                 <Button 
                    type="button" variant="secondary" size="sm" 
                    className="bg-background/70 hover:bg-background/90 backdrop-blur-md shadow-sm h-9 px-3 text-xs font-medium border-0"
                    onClick={() => coverInputRef.current?.click()}
                 >
                    <ImageIcon className="h-3.5 w-3.5 mr-2 text-primary" /> 
                    {coverUrl ? "Alterar Capa" : "Adicionar Capa"}
                 </Button>

                 {coverUrl && (
                    <Button 
                        type="button" variant="destructive" size="icon" 
                        className="h-9 w-9 shadow-sm opacity-80 hover:opacity-100 backdrop-blur-md"
                        onClick={() => { 
                            setCoverUrl(""); 
                            if (coverInputRef.current) coverInputRef.current.value = ""; 
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                 )}
            </div>
             
            <input type="file" ref={coverInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageProcess(e, true)} />
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageProcess(e, false)} />
        </div>

        <CardContent className="relative px-8 pb-10">
           <div className="flex flex-col md:flex-row gap-8 -mt-20 items-start">
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
          <Card className="border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle>Paleta de Cores</CardTitle>
              <CardDescription>Escolha um preset ou personalize a cor do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                
                {/* 1. Presets */}
                {colors.map((color) => (
                  <div 
                    key={color.name} 
                    className={cn(
                        "cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-muted transition-all aspect-square justify-center relative group", 
                        themeColor === color.name ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30"
                    )} 
                    onClick={() => handleColorChange(color.name)} 
                    title={color.label}
                  >
                      <div className={cn("h-6 w-6 rounded-full shadow-sm ring-2 ring-offset-2 ring-transparent transition-all group-hover:scale-110", color.bg)} />
                      {themeColor === color.name && (<div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 animate-in zoom-in"><Check className="h-2 w-2 text-primary-foreground" /></div>)}
                  </div>
                ))}

                {/* 2. Seletor Customizado */}
                <div 
                    className={cn(
                        "cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-muted transition-all aspect-square justify-center relative group overflow-hidden",
                        !isPreset ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30"
                    )}
                    title="Cor Personalizada"
                >
                    <div className="h-6 w-6 rounded-full shadow-sm ring-2 ring-offset-2 ring-transparent group-hover:scale-110 transition-transform flex items-center justify-center overflow-hidden relative">
                        
                        {/* Se NÃO é preset (Custom Ativo) -> Mostra a cor sólida */}
                        {!isPreset ? (
                            <div 
                                className="w-full h-full border border-black/10" 
                                style={{ backgroundColor: customColorInput }} 
                            />
                        ) : (
                            /* Se É preset (Custom Inativo) -> Mostra o arco-íris */
                            <div
                            className="w-full h-full bg-gradient-to-br"
                            style={{
                                background: "conic-gradient( red, orange, yellow, green, blue, indigo, violet)"
                            }}
                            />
                        )}

                        {/* Ícone de Paleta sobre o arco-íris */}
                        {(isPreset) && <Palette className="h-3 w-3 text-white absolute " />}
                    </div>
                    
                    {/* Input Color Nativo (Oculto mas clicável) */}
                    <input 
                        type="color" 
                        value={customColorInput} 
                        onChange={handleCustomColorChange}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    
                    {/* Check de Ativo */}
                    {!isPreset && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 animate-in zoom-in pointer-events-none">
                            <Check className="h-2 w-2 text-primary-foreground" />
                        </div>
                    )}
                </div>

              </div>
            </CardContent>
          </Card>

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

      <div className="flex justify-end pt-4 border-t border-border">
        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto shadow-lg transition-all hover:scale-[1.02] bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Salvando...</span>) : ("Salvar Alterações")}
        </Button>
      </div>
    </form>
  );
}