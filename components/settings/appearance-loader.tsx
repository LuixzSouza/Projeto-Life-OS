"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { User, Mail, Palette, Save, Loader2, Camera, Upload, Trash2, Sparkles, Moon, Sun, Laptop, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// Cores do Tema
const THEME_COLORS = [
    { name: "Zinc", value: "zinc", class: "bg-zinc-600", ring: "ring-zinc-600", hex: "#52525b" },
    { name: "Blue", value: "blue", class: "bg-blue-600", ring: "ring-blue-600", hex: "#2563eb" },
    { name: "Violet", value: "violet", class: "bg-violet-600", ring: "ring-violet-600", hex: "#7c3aed" },
    { name: "Rose", value: "rose", class: "bg-rose-600", ring: "ring-rose-600", hex: "#e11d48" },
    { name: "Orange", value: "orange", class: "bg-orange-500", ring: "ring-orange-500", hex: "#f97316" },
    { name: "Green", value: "green", class: "bg-emerald-500", ring: "ring-emerald-500", hex: "#10b981" },
];

interface AppearanceProps {
    initialColor?: string | null;
    userName?: string;
    userEmail?: string;
    userAvatar?: string | null;
    userBio?: string | null;
    userCover?: string | null; // ✅ Novo Prop
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
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState(initialColor || "zinc");
    
    // Estados para preview
    const [previewName, setPreviewName] = useState(userName || "");
    const [previewAvatar, setPreviewAvatar] = useState(userAvatar || "");
    const [previewCover, setPreviewCover] = useState(userCover || ""); // ✅ Estado da Capa
    
    // Referências para os inputs invisíveis
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null); // ✅ Ref da Capa

    // Função genérica para processar imagem (Avatar ou Capa)
    const handleImageProcess = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) { // 3MB limit
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
        
        // Avatar Logic
        if (previewAvatar.startsWith("data:image")) {
            formData.set("avatarUrl", previewAvatar);
        } else if (previewAvatar === "") {
            formData.set("avatarUrl", ""); 
        }

        // ✅ Capa Logic
        if (previewCover.startsWith("data:image")) {
            formData.set("coverUrl", previewCover);
        } else if (previewCover === "") {
            formData.set("coverUrl", "");
        }

        formData.set("accentColor", selectedColor);

        try {
            await updateSettings(formData);
            toast.success("Perfil atualizado com sucesso!");
            if (initialColor !== selectedColor) {
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            toast.error("Erro ao atualizar perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    const currentColorObj = THEME_COLORS.find(c => c.value === selectedColor) || THEME_COLORS[0];

    return (
        <form action={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            
            {/* 1. CARTÃO DE IDENTIDADE */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg overflow-hidden group">
                
                {/* --- BANNER / CAPA --- */}
                <div 
                    className="h-48 w-full relative transition-colors duration-500 bg-cover bg-center"
                    style={{ 
                        // Se tiver capa, usa ela. Se não, usa gradiente da cor do tema.
                        backgroundImage: previewCover ? `url(${previewCover})` : `linear-gradient(to right, ${currentColorObj.hex}40, ${currentColorObj.hex}10)`,
                    }}
                >
                    {/* Overlay suave se não tiver imagem, grid se tiver */}
                    {!previewCover && <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />}
                    {previewCover && <div className="absolute inset-0 bg-black/20" />} {/* Escurecer levemente a foto */}

                    {/* Botões de Ação da Capa */}
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

                    {/* Inputs Invisíveis */}
                    <input 
                        type="file" 
                        ref={coverInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageProcess(e, true)} // True = é capa
                    />
                    <input 
                        type="file" 
                        ref={avatarInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageProcess(e, false)} // False = é avatar
                    />
                </div>

                <CardContent className="relative px-8 pb-10">
                    
                    {/* --- ÁREA DO AVATAR --- */}
                    <div className="flex flex-col md:flex-row gap-8 -mt-20 items-start">
                        
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="relative group/avatar">
                                <Avatar 
                                    className="h-36 w-36 border-[6px] border-white dark:border-zinc-950 shadow-2xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer" 
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {/* ✅ CORREÇÃO DO ERRO: src={previewAvatar || undefined} */}
                                    <AvatarImage src={previewAvatar || undefined} className="object-cover" />
                                    <AvatarFallback className="text-4xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-300">
                                        {previewName?.slice(0, 2).toUpperCase() || "EU"}
                                    </AvatarFallback>
                                </Avatar>
                                
                                {/* Overlay de Upload no Avatar */}
                                <div 
                                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-[6px] border-transparent"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Editar</span>
                                </div>
                            </div>

                            {/* Botões do Avatar */}
                            <div className="flex gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-xs px-2 shadow-sm"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1" /> Foto
                                </Button>
                                {previewAvatar && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
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
                                    <Label htmlFor="name" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium">
                                        <User className="h-4 w-4" /> Nome de Exibição
                                    </Label>
                                    <Input 
                                        name="name" 
                                        value={previewName}
                                        onChange={(e) => setPreviewName(e.target.value)}
                                        placeholder="Seu nome" 
                                        className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500 transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium">
                                        <Mail className="h-4 w-4" /> Email de Login
                                    </Label>
                                    <Input 
                                        name="email" 
                                        defaultValue={userEmail} 
                                        placeholder="seu@email.com" 
                                        className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500 transition-all" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-zinc-600 dark:text-zinc-400 font-medium">Bio / Objetivo Atual</Label>
                                <Textarea 
                                    name="bio" 
                                    defaultValue={userBio || ""} 
                                    placeholder="O que você está focando no momento?" 
                                    className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 resize-none h-24 focus-visible:ring-indigo-500" 
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. PERSONALIZAÇÃO DE INTERFACE (CORES E TEMAS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Cores */}
                <Card className="md:col-span-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Palette className="h-5 w-5 text-indigo-500" /> Cor de Destaque
                        </CardTitle>
                        <CardDescription>Define a personalidade visual do seu sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                            {THEME_COLORS.map((color) => (
                                <label key={color.value} className="relative cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="accentColor" 
                                        value={color.value} 
                                        className="peer sr-only" 
                                        checked={selectedColor === color.value}
                                        onChange={() => setSelectedColor(color.value)}
                                    />
                                    <div className={cn(
                                        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                                        selectedColor === color.value 
                                            ? `bg-white dark:bg-zinc-900 border-${color.value}-500 ring-1 ${color.ring} ring-offset-2 dark:ring-offset-zinc-950`
                                            : "border-transparent bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}>
                                        <div className={cn("w-6 h-6 rounded-full shadow-sm", color.class)} />
                                        <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">{color.name}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Tema (Claro/Escuro) */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Modo</CardTitle>
                        <CardDescription>Aparência geral.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div 
                            onClick={() => setTheme("light")} 
                            className={cn(
                                "flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                                theme === 'light' ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100" : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            )}
                        >
                            <Sun className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium">Claro</span>
                        </div>
                        <div 
                            onClick={() => setTheme("dark")} 
                            className={cn(
                                "flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                                theme === 'dark' ? "border-indigo-500 bg-zinc-900" : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            )}
                        >
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium">Escuro</span>
                        </div>
                        <div 
                            onClick={() => setTheme("system")} 
                            className={cn(
                                "flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                                theme === 'system' ? "border-zinc-500" : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            )}
                        >
                            <Laptop className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm font-medium">Sistema</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="flex justify-end pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="submit" disabled={isLoading} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold px-8 h-12 rounded-xl shadow-xl transition-transform hover:scale-[1.02]">
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando Perfil...
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