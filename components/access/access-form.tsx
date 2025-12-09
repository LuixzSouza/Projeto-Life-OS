"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { createAccess, updateAccess } from "@/app/(dashboard)/access/actions";
import { toast } from "sonner";
import { Loader2, Lock, Globe, User, Key, Eye, EyeOff } from "lucide-react";

// Tipagem manual para evitar 'any'
export interface AccessData {
    id?: string;
    title: string;
    username?: string | null;
    password?: string;
    url?: string | null;
    category?: string;
    notes?: string | null;
}

export function AccessForm({ item, onClose }: { item?: AccessData, onClose: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            if (item) {
                await updateAccess(formData);
                toast.success("Acesso atualizado!");
            } else {
                await createAccess(formData);
                toast.success("Acesso salvo no cofre!");
            }
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-4 py-2">
            {item && <input type="hidden" name="id" value={item.id} />}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nome do Serviço</Label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input name="title" defaultValue={item?.title} placeholder="Ex: Instagram" className="pl-9" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select name="category" defaultValue={item?.category || "SOCIAL"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FINANCE">Banco / Financeiro</SelectItem>
                            <SelectItem value="SOCIAL">Rede Social</SelectItem>
                            <SelectItem value="WORK">Trabalho</SelectItem>
                            <SelectItem value="OTHERS">Outros</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Usuário / Email</Label>
                <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input name="username" defaultValue={item?.username || ""} placeholder="usuario@email.com" className="pl-9" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        defaultValue={item?.password} 
                        placeholder="••••••••" 
                        className="pl-9 pr-10 font-mono" 
                        required 
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Link de Acesso (URL)</Label>
                <Input name="url" defaultValue={item?.url || ""} placeholder="https://..." />
            </div>

            <div className="space-y-2">
                <Label>Notas (PINs, Perguntas de segurança)</Label>
                <Textarea name="notes" defaultValue={item?.notes || ""} placeholder="Info extra..." rows={2} />
            </div>

            <DialogFooter className="pt-2">
                <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (item ? "Salvar Alterações" : "Guardar no Cofre")}
                </Button>
            </DialogFooter>
        </form>
    );
}