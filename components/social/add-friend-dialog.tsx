"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    UserPlus, Heart, Briefcase, Star, Users, Camera, 
    UploadCloud, X, Phone, Mail, Instagram, Linkedin, 
    Calendar, Wallet, MapPin, Gift, StickyNote 
} from "lucide-react";
import { toast } from "sonner";
import { createFriend, updateFriend } from "@/app/(dashboard)/social/actions";
import { cn } from "@/lib/utils";

// --- Tipos ---
export type FriendData = {
    id?: string;
    name?: string;
    nickname?: string | null;
    phone?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    jobTitle?: string | null;
    company?: string | null;
    birthday?: string | null;
    proximity?: string;
    notes?: string | null;
    pixKey?: string | null;
    address?: string | null;
    imageUrl?: string | null;
    giftIdeas?: string | null;
};

interface FriendFormDialogProps {
    mode?: "create" | "edit";
    initialData?: FriendData;
    trigger?: React.ReactNode; 
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

// --- Componente Principal ---
export function FriendFormDialog({ 
    mode = "create", 
    initialData, 
    trigger, 
    open: controlledOpen, 
    onOpenChange 
}: FriendFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    // Chave para forçar o reset do formulário quando os dados mudam
    const formKey = isOpen ? (initialData?.id || 'new') : 'closed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* ✅ CORREÇÃO: Lógica de Exibição do Gatilho (Trigger)
                1. Se um 'trigger' customizado for passado, renderiza ele.
                2. Se for modo 'create' e sem trigger, renderiza o botão padrão "Nova Conexão".
                3. Se for modo 'edit' e sem trigger, NÃO RENDERIZA NADA (modal controlado apenas por 'open').
            */}
            {(trigger || mode === "create") && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="gap-2 shadow-lg shadow-primary/20 font-semibold transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                            <UserPlus className="h-5 w-5" /> Nova Conexão
                        </Button>
                    )}
                </DialogTrigger>
            )}
            
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/50 bg-background rounded-3xl shadow-2xl">
                {/* Renderiza o Inner apenas quando aberto para garantir 
                   que o estado interno (inputs) seja montado do zero com os dados corretos.
                */}
                {isOpen && (
                    <FriendFormInner 
                        key={formKey} 
                        mode={mode} 
                        initialData={initialData} 
                        onSuccess={() => setIsOpen(false)}
                        onCancel={() => setIsOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

// --- Lógica Interna do Formulário ---
function FriendFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: FriendData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    
    // States
    const [name, setName] = useState(initialData?.name || "");
    const [phone, setPhone] = useState(initialData?.phone || "");
    const [proximity, setProximity] = useState(initialData?.proximity || "CASUAL");
    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || ""); 
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setPhone(value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const maxSize = 300;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width; canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                setPreviewImage(canvas.toDataURL("image/jpeg", 0.8));
                toast.success("Foto carregada!");
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("O nome é obrigatório."); return; }

        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.set('proximity', proximity);
        formData.set('phone', phone);
        if (previewImage.startsWith("data:")) formData.set('imageUrl', previewImage);
        else if (!previewImage) formData.delete('imageUrl');

        let result;
        if (mode === "edit" && initialData?.id) {
            formData.append("id", initialData.id);
            result = await updateFriend(formData);
        } else {
            result = await createFriend(formData);
        }

        if (result.success) {
            toast.success(result.message);
            onSuccess();
        } else {
            toast.error(result.message || "Erro ao salvar.");
        }
        setIsLoading(false);
    };

    const initials = name ? name.substring(0, 2).toUpperCase() : "??";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            
            {/* --- HEADER VISUAL --- */}
            <div className="relative bg-gradient-to-b from-primary/10 to-background p-8 pt-10 text-center shrink-0 border-b border-border/40">
                
                {/* Dialog Header Oculto para Acessibilidade */}
                <DialogHeader className="sr-only">
                    <DialogTitle>{mode === "create" ? "Nova Conexão" : "Editar Perfil"}</DialogTitle>
                    <DialogDescription>Formulário de cadastro de contatos</DialogDescription>
                </DialogHeader>

                <div className="relative z-10 flex flex-col items-center gap-5">
                    
                    {/* Avatar Upload */}
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-32 w-32 border-4 border-background shadow-2xl ring-2 ring-primary/20 transition-transform group-hover:scale-105">
                            <AvatarImage src={previewImage || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        
                        {/* Remove Button */}
                        {previewImage && (
                            <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(""); }} 
                                className="absolute -top-1 -right-1 p-1.5 bg-destructive rounded-full text-destructive-foreground hover:bg-destructive/90 shadow-md transition-all z-20 ring-2 ring-background"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                            <Camera className="h-8 w-8 text-white mb-1" />
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Alterar</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            {mode === "create" ? "Nova Conexão" : "Editar Perfil"}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Preencha os detalhes para organizar sua rede.
                        </p>
                    </div>
                </div>
            </div>

            {/* --- CONTEÚDO SCROLLÁVEL --- */}
            <div className="p-6 md:p-8 space-y-8 bg-background flex-1">
                
                {/* Image URL Fallback */}
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50">
                    <div className="p-2 bg-background rounded-lg text-muted-foreground border border-border/50">
                        <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ou cole o link da foto</Label>
                        <Input 
                            name="imageUrl" 
                            placeholder="https://..." 
                            value={!previewImage.startsWith("data:") ? previewImage : ""} 
                            onChange={(e) => setPreviewImage(e.target.value)} 
                            className="h-7 text-xs border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50" 
                        />
                    </div>
                </div>

                {/* Seção 1: Identidade */}
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label>Nome Completo <span className="text-destructive">*</span></Label>
                            <Input name="name" placeholder="Ex: Gabriel" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label>Vulgo / Apelido</Label>
                            <Input name="nickname" defaultValue={initialData?.nickname || ""} placeholder="Como você o chama?" className="h-11 bg-background" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Nível de Proximidade</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { id: "FAMILY", label: "Família", icon: Heart, activeClass: "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" },
                                { id: "CLOSE", label: "Próximo", icon: Star, activeClass: "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" },
                                { id: "WORK", label: "Trabalho", icon: Briefcase, activeClass: "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" },
                                { id: "CASUAL", label: "Casual", icon: Users, activeClass: "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" }
                            ].map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => setProximity(item.id)} 
                                    className={cn(
                                        "cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:bg-accent",
                                        proximity === item.id ? item.activeClass : "border-border bg-card text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-xs font-semibold">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Seção 2: Contatos */}
                <div className="bg-secondary/20 p-5 rounded-2xl border border-border/50 space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <div className="p-1.5 bg-background text-primary rounded-md border border-border/50">
                            <Phone className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">Canais de Contato</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="phone" value={phone} onChange={handlePhoneChange} placeholder="WhatsApp" maxLength={15} className="bg-background" />
                        
                        <div className="relative group">
                            <Input name="instagram" defaultValue={initialData?.instagram || ""} placeholder="Instagram" className="pl-9 bg-background" />
                            <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        
                        <div className="relative group">
                            <Input name="linkedin" defaultValue={initialData?.linkedin || ""} placeholder="LinkedIn" className="pl-9 bg-background" />
                            <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        
                        <div className="relative group">
                            <Input name="birthday" type="date" defaultValue={initialData?.birthday ? new Date(initialData.birthday).toISOString().split('T')[0] : ""} className="pl-9 bg-background" />
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Seção 3: Profissional & Pessoal */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Profissional</Label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input name="jobTitle" defaultValue={initialData?.jobTitle || ""} placeholder="Cargo" className="pl-9" />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input name="company" defaultValue={initialData?.company || ""} placeholder="Empresa" className="pl-9" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Financeiro & Endereço</Label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input name="pixKey" defaultValue={initialData?.pixKey || ""} placeholder="Chave Pix" className="pl-9 font-mono" />
                                </div>
                                <Input name="address" defaultValue={initialData?.address || ""} placeholder="Endereço Completo" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Gift className="h-3.5 w-3.5 text-primary" /> Ideias de Presente</Label>
                            <Textarea name="giftIdeas" defaultValue={initialData?.giftIdeas || ""} placeholder="Ex: Vinhos, Livros de Sci-Fi..." className="min-h-[80px] resize-none bg-secondary/10 border-border/60 focus:border-primary/50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><StickyNote className="h-3.5 w-3.5 text-primary" /> Notas Gerais</Label>
                            <Textarea name="notes" defaultValue={initialData?.notes || ""} placeholder="Ex: Alérgico a camarão..." className="min-h-[80px] resize-none bg-secondary/10 border-border/60 focus:border-primary/50" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 mt-auto">
                <div className="flex gap-3 w-full sm:w-auto">
                    <Button type="button" variant="ghost" onClick={onCancel} className="h-11 px-6 flex-1 sm:flex-none">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-11 px-8 rounded-xl font-semibold flex-1 sm:flex-none shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90">
                        {isLoading ? "Salvando..." : "Salvar Conexão"}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    );
}