"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { User, Mail, Palette, UserCircle, Save, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Cores do Tema (Sincronizado com o seletor de projetos para consistência)
const THEME_COLORS = [
    { name: "Zinc", value: "zinc", class: "bg-zinc-500" },
    { name: "Blue", value: "blue", class: "bg-blue-500" },
    { name: "Violet", value: "violet", class: "bg-violet-500" },
    { name: "Rose", value: "rose", class: "bg-rose-500" },
    { name: "Orange", value: "orange", class: "bg-orange-500" },
    { name: "Green", value: "green", class: "bg-green-500" },
];

interface AppearanceProps {
    initialColor?: string | null;
    userName?: string;
    userEmail?: string;
    userAvatar?: string | null;
    userBio?: string | null;
}

export function AppearanceLoader({ 
    initialColor, 
    userName, 
    userEmail, 
    userAvatar,
    userBio 
}: AppearanceProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState(initialColor || "zinc");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await updateSettings(formData);
            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-8">
            
            {/* Seção de Avatar e Dados Básicos */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Preview do Avatar */}
                <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24 border-2 border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <AvatarImage src={userAvatar || ""} alt={userName} />
                        <AvatarFallback className="text-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                            {userName?.slice(0, 2).toUpperCase() || "EU"}
                        </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-zinc-400 text-center max-w-[120px]">
                        A imagem é puxada da URL abaixo.
                    </p>
                </div>

                {/* Campos de Texto */}
                <div className="flex-1 space-y-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="h-4 w-4 text-zinc-400" /> Nome
                            </Label>
                            <Input name="name" defaultValue={userName} placeholder="Seu nome" className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-zinc-400" /> Email
                            </Label>
                            <Input name="email" defaultValue={userEmail} placeholder="seu@email.com" className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-zinc-400" /> URL do Avatar
                        </Label>
                        <Input name="avatarUrl" defaultValue={userAvatar || ""} placeholder="https://..." className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono text-xs" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea 
                            name="bio" 
                            defaultValue={userBio || ""} 
                            placeholder="Um pouco sobre você..." 
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 resize-none h-20" 
                        />
                    </div>
                </div>
            </div>

            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />

            {/* Seção de Cor de Destaque */}
            <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base">
                    <Palette className="h-4 w-4 text-zinc-900 dark:text-zinc-100" /> Tema do Sistema
                </Label>
                
                <div className="flex flex-wrap gap-4">
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
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full ${color.class} border-4 border-transparent peer-checked:border-white dark:peer-checked:border-black peer-checked:ring-2 peer-checked:ring-zinc-900 dark:peer-checked:ring-white transition-all shadow-sm group-hover:scale-110`}></div>
                                <span className={`text-xs font-medium ${selectedColor === color.value ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>
                                    {color.name}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
                <p className="text-xs text-zinc-500">
                    Isso define a cor principal de botões, links e destaques no painel.
                </p>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" className="w-full md:w-auto min-w-[150px] bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Alterações
                </Button>
            </div>
        </form>
    );
}