"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { User, Mail, Palette, Save, Loader2, Camera, Upload, Trash2, Sparkles, Moon, Sun, Laptop, Image as ImageIcon, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useThemeColor } from "@/components/providers/theme-color-provider"; // ✅ Importe o contexto

// Cores compatíveis com o globals.css
const THEME_COLORS = [
    { name: "theme-blue", label: "Azul", bg: "bg-blue-600" },
    { name: "theme-green", label: "Verde", bg: "bg-green-600" },
    { name: "theme-orange", label: "Laranja", bg: "bg-orange-500" },
    { name: "theme-violet", label: "Roxo", bg: "bg-violet-600" },
    { name: "theme-rose", label: "Rose", bg: "bg-rose-600" },
];

interface AppearanceProps {
    initialColor?: string | null;
    userName?: string;
    userEmail?: string;
    userAvatar?: string | null;
    userBio?: string | null;
    userCover?: string | null;
}

export function AppearanceLoader({ 
    initialColor, 
    userName, 
    userEmail, 
    userAvatar, 
    userBio,
    userCover 
}: AppearanceProps) {
    const { setTheme, theme } = useTheme();
    // ✅ Usando contexto global para mudança instantânea
    const { themeColor, setThemeColor } = useThemeColor(); 
    
    // ✅ Estado de montagem para corrigir erro de Hidratação
    const [mounted, setMounted] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para preview
    const [previewName, setPreviewName] = useState(userName || "");
    const [previewAvatar, setPreviewAvatar] = useState(userAvatar || "");
    const [previewCover, setPreviewCover] = useState(userCover || "");
    
    // Referências para os inputs invisíveis
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Efeito para garantir que rodamos apenas no cliente
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleImageProcess = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) { 
                toast.error("A imagem deve ter no máximo 3MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (isCover) {
                    setPreviewCover(base64String);
                } else {
                    setPreviewAvatar(base64String);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        
        if (previewAvatar.startsWith("data:image")) {
            formData.set("avatarUrl", previewAvatar);
        } else if (previewAvatar === "") {
            formData.set("avatarUrl", ""); 
        }

        if (previewCover.startsWith("data:image")) {
            formData.set("coverUrl", previewCover);
        } else if (previewCover === "") {
            formData.set("coverUrl", "");
        }

        // Envia a cor atual do contexto
        formData.set("accentColor", themeColor);

        try {
            await updateSettings(formData);
            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ Se não estiver montado, renderiza um esqueleto ou loader para evitar conflito de HTML
    if (!mounted) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando preferências...</span>
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            
            {/* 1. CARTÃO DE IDENTIDADE */}
            <Card className="border-border bg-card shadow-lg overflow-hidden group">
                
                {/* --- BANNER / CAPA --- */}
                <div 
                    className="h-48 w-full relative transition-all duration-500 bg-cover bg-center"
                    style={{ 
                        backgroundImage: previewCover 
                            ? `url(${previewCover})` 
                            : `linear-gradient(to right, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))`,
                    }}
                >
                    {!previewCover && <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />}
                    {previewCover && <div className="absolute inset-0 bg-black/20" />}

                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => coverInputRef.current?.click()}
                            className="h-8 bg-white/80 hover:bg-white text-black backdrop-blur-md shadow-sm"
                        >
                            <ImageIcon className="w-3 h-3 mr-2" /> {previewCover ? "Trocar Capa" : "Adicionar Capa"}
                        </Button>
                        
                        {previewCover && (
                            <Button 
                                type="button" 
                                variant="destructive" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => { setPreviewCover(""); if(coverInputRef.current) coverInputRef.current.value = ""; }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>

                    <input 
                        type="file" ref={coverInputRef} className="hidden" accept="image/*" 
                        onChange={(e) => handleImageProcess(e, true)} 
                    />
                    <input 
                        type="file" ref={avatarInputRef} className="hidden" accept="image/*" 
                        onChange={(e) => handleImageProcess(e, false)} 
                    />
                </div>

                <CardContent className="relative px-8 pb-10">
                    {/* --- ÁREA DO AVATAR --- */}
                    <div className="flex flex-col md:flex-row gap-8 -mt-20 items-start">
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="relative group/avatar">
                                <Avatar 
                                    className="h-36 w-36 border-[6px] border-background shadow-2xl bg-muted cursor-pointer" 
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <AvatarImage src={previewAvatar || undefined} className="object-cover" />
                                    <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                                        {previewName?.slice(0, 2).toUpperCase() || "EU"}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div 
                                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-[6px] border-transparent"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Editar</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    type="button" variant="outline" size="sm" 
                                    className="h-7 text-xs px-2 shadow-sm"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1" /> Foto
                                </Button>
                                {previewAvatar && (
                                    <Button 
                                        type="button" variant="ghost" size="sm" 
                                        className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        onClick={() => { setPreviewAvatar(""); if(avatarInputRef.current) avatarInputRef.current.value = ""; }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* --- CAMPOS DE TEXTO --- */}
                        <div className="flex-1 w-full pt-4 md:pt-20 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <User className="h-4 w-4" /> Nome de Exibição
                                    </Label>
                                    <Input 
                                        name="name" 
                                        value={previewName}
                                        onChange={(e) => setPreviewName(e.target.value)}
                                        placeholder="Seu nome" 
                                        className="h-11 bg-muted/50 border-border focus-visible:ring-primary transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <Mail className="h-4 w-4" /> Email de Login
                                    </Label>
                                    <Input 
                                        name="email" 
                                        defaultValue={userEmail} 
                                        placeholder="seu@email.com" 
                                        className="h-11 bg-muted/50 border-border focus-visible:ring-primary transition-all" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-muted-foreground font-medium">Bio / Objetivo Atual</Label>
                                <Textarea 
                                    name="bio" 
                                    defaultValue={userBio || ""} 
                                    placeholder="O que você está focando no momento?" 
                                    className="bg-muted/50 border-border resize-none h-24 focus-visible:ring-primary" 
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. PERSONALIZAÇÃO DE INTERFACE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Cores */}
                <Card className="md:col-span-2 border-border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Palette className="h-5 w-5 text-primary" /> Cor de Destaque
                        </CardTitle>
                        <CardDescription>Define a personalidade visual do seu sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                            {THEME_COLORS.map((color) => (
                                <div 
                                    key={color.name}
                                    onClick={() => setThemeColor(color.name)} // Muda o contexto global
                                    className={cn(
                                        "cursor-pointer relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:bg-muted",
                                        themeColor === color.name 
                                            ? "border-primary bg-primary/5 ring-1 ring-primary ring-offset-2 dark:ring-offset-zinc-950"
                                            : "border-transparent bg-muted/30"
                                    )}
                                >
                                    <div className={cn("w-6 h-6 rounded-full shadow-sm", color.bg)} />
                                    <span className="text-[10px] font-semibold text-muted-foreground">{color.label}</span>
                                    {themeColor === color.name && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                            <Check className="h-2 w-2" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Tema (Claro/Escuro) */}
                <Card className="border-border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Modo</CardTitle>
                        <CardDescription>Aparência geral.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {[
                            { id: "light", icon: Sun, label: "Claro" },
                            { id: "dark", icon: Moon, label: "Escuro" },
                            { id: "system", icon: Laptop, label: "Sistema" }
                        ].map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => setTheme(item.id)} 
                                className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                                    theme === item.id 
                                        ? "border-primary bg-primary/10 text-primary font-medium" 
                                        : "border-transparent hover:bg-muted text-muted-foreground"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", theme === item.id ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="flex justify-end pt-6 border-t border-border">
                <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-[1.02]">
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}