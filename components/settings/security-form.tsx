"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";

export function SecurityForm() {
    const handleSubmit = async (formData: FormData) => {
        await changePassword(formData);
        toast.success("Senha mestra alterada. Faça login novamente.");
    };

    return (
        <Card className="border-destructive/20 bg-card shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-destructive" /> 
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <ShieldCheck className="h-5 w-5 text-destructive" /> Segurança e Acesso
                </CardTitle>
                <CardDescription>Gerencie a senha mestra que protege todo o sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                        <div className="text-xs text-destructive-foreground/80 dark:text-red-300 space-y-1">
                            <p className="font-bold text-destructive">Atenção:</p>
                            <p className="text-muted-foreground">Alterar a senha desconectará todas as sessões ativas imediatamente.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="newPassword">Nova Senha Mestra</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input id="newPassword" type="password" name="newPassword" required placeholder="••••••••" className="pl-9 bg-background border-border focus-visible:ring-destructive" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" variant="destructive" className="shadow-sm">Atualizar Credenciais</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}