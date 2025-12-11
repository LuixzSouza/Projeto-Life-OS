"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    UserPlus, Heart, Briefcase, MapPin, Gift,
    Instagram, Linkedin, Phone, Wallet, Calendar, Star, Users, Camera, UploadCloud, X
} from "lucide-react";
import { toast } from "sonner";
import { createFriend, updateFriend } from "@/app/(dashboard)/social/actions";
import { cn } from "@/lib/utils";

// Tipo dos dados
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

    // Usamos uma chave para forçar o React a "resetar" o formulário quando mudamos de amigo
    // Isso elimina a necessidade do useEffect que estava dando erro!
    const formKey = isOpen ? (initialData?.id || 'new') : 'closed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg h-11 px-6 rounded-xl font-semibold transition-transform active:scale-95">
                        <UserPlus className="h-5 w-5" /> Nova Conexão
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-zinc-50 dark:bg-zinc-950 border-0 rounded-3xl">
                {/* Renderizamos o formulário interno isolado para garantir o reset de estado */}
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

// --- SUBCOMPONENTE INTERNO (Lógica do Form) ---
function FriendFormInner({ mode, initialData, onSuccess, onCancel }: { mode: string, initialData?: FriendData, onSuccess: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    
    // States inicializados diretamente com props (sem useEffect!)
    const [name, setName] = useState(initialData?.name || "");
    const [phone, setPhone] = useState(initialData?.phone || "");
    const [proximity, setProximity] = useState(initialData?.proximity || "CASUAL");
    const [previewImage, setPreviewImage] = useState(initialData?.imageUrl || ""); 
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- MÁSCARA DE TELEFONE ---
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setPhone(value);
    };

    // --- UPLOAD E COMPRESSÃO ---
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
        <>
            <div className="bg-zinc-900 p-8 pt-10 text-white relative overflow-hidden text-center shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-32 w-32 border-4 border-white/10 shadow-2xl bg-indigo-600 transition-transform group-hover:scale-105">
                            <AvatarImage src={previewImage || undefined} className="object-cover" />
                            <AvatarFallback className="bg-indigo-600 text-white text-4xl font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        {previewImage && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewImage(""); }} className="absolute top-0 right-0 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-md transition-all z-20"><X className="h-4 w-4" /></button>
                        )}
                        <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                            <Camera className="h-8 w-8 text-white mb-1" /><span className="text-[10px] font-bold uppercase tracking-wider">Alterar</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold">{mode === "create" ? "Quem vamos adicionar?" : "Editando Perfil"}</DialogTitle>
                        <DialogDescription className="text-zinc-400 mt-1">Preencha o perfil completo.</DialogDescription>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Link Opção */}
                <div className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-zinc-500"><UploadCloud className="h-5 w-5" /></div>
                    <div className="flex-1">
                        <Label className="text-[10px] font-bold text-zinc-500 uppercase">Ou cole o link da foto</Label>
                        <Input name="imageUrl" placeholder="https://..." value={!previewImage.startsWith("data:") ? previewImage : ""} onChange={(e) => setPreviewImage(e.target.value)} className="h-8 text-xs border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 placeholder:text-zinc-400" />
                    </div>
                </div>

                {/* Campos */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Nome Completo</Label><Input name="name" placeholder="Ex: Gabriel" required value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg bg-white dark:bg-zinc-900" /></div>
                        <div className="space-y-2"><Label>Vulgo</Label><Input name="nickname" defaultValue={initialData?.nickname || ""} placeholder="Apelido" className="h-12 bg-white dark:bg-zinc-900" /></div>
                    </div>
                    <div className="space-y-2">
                        <Label>Nível de Amizade</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[{ id: "FAMILY", label: "Família", icon: Heart, color: "text-purple-500", bg: "bg-purple-50" }, { id: "CLOSE", label: "Próximo", icon: Star, color: "text-amber-500", bg: "bg-amber-50" }, { id: "WORK", label: "Trabalho", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" }, { id: "CASUAL", label: "Casual", icon: Users, color: "text-zinc-500", bg: "bg-zinc-100" }].map((item) => (
                                <div key={item.id} onClick={() => setProximity(item.id)} className={cn("cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all", proximity === item.id ? `border-indigo-600 bg-white dark:bg-zinc-900 shadow-md` : "border-transparent bg-zinc-100/50 dark:bg-zinc-900/50 hover:border-zinc-200")}>
                                    <item.icon className={cn("h-6 w-6", item.color)} /><span className={cn("text-xs font-bold", item.color.replace('text-', 'text-'))}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2"><div className="p-1.5 bg-green-100 text-green-600 rounded-md"><Phone className="h-4 w-4" /></div><h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Contatos</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="phone" value={phone} onChange={handlePhoneChange} placeholder="WhatsApp" maxLength={15} className="bg-zinc-50 dark:bg-zinc-950" />
                        <div className="relative"><Input name="instagram" defaultValue={initialData?.instagram || ""} placeholder="Instagram" className="pl-9 bg-zinc-50 dark:bg-zinc-950" /><Instagram className="absolute left-3 top-2.5 h-4 w-4 text-pink-500" /></div>
                        <div className="relative"><Input name="linkedin" defaultValue={initialData?.linkedin || ""} placeholder="LinkedIn" className="pl-9 bg-zinc-50 dark:bg-zinc-950" /><Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" /></div>
                        <div className="relative"><Input name="birthday" type="date" defaultValue={initialData?.birthday ? new Date(initialData.birthday).toISOString().split('T')[0] : ""} className="pl-9 bg-zinc-50 dark:bg-zinc-950" /><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Trabalho</Label><Input name="jobTitle" defaultValue={initialData?.jobTitle || ""} placeholder="Cargo" /><Input name="company" defaultValue={initialData?.company || ""} placeholder="Empresa" className="mt-2" /></div>
                        <div className="space-y-2"><Label>Chave Pix</Label><div className="relative"><Input name="pixKey" defaultValue={initialData?.pixKey || ""} placeholder="Pix" className="pl-9 font-mono" /><Wallet className="absolute left-3 top-2.5 h-4 w-4 text-green-600" /></div><Input name="address" defaultValue={initialData?.address || ""} placeholder="Endereço" className="mt-2" /></div>
                    </div>
                    <div className="space-y-2"><Label>Ideias de Presente</Label><Textarea name="giftIdeas" defaultValue={initialData?.giftIdeas || ""} placeholder="Vinhos..." className="min-h-[60px] bg-pink-50/30 border-pink-100" /></div>
                    <div className="space-y-2"><Label>Notas Gerais</Label><Textarea name="notes" defaultValue={initialData?.notes || ""} placeholder="Alergias..." className="min-h-[80px] bg-yellow-50/50 border-yellow-200" /></div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onCancel} className="h-12 px-6">Cancelar</Button>
                    <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-bold w-full sm:w-auto">{isLoading ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
            </form>
        </>
    );
}