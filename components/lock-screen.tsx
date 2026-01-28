"use client";

import { useState } from "react";
import { verifyMasterPassword } from "@/app/(dashboard)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LockScreenProps {
    onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await verifyMasterPassword(password);
        
        if (res.success) {
            toast.dismiss(); // Limpa toasts antigos
            toast.success("Bem-vindo de volta!");
            onUnlock();
        } else {
            toast.error("Senha incorreta.");
            setPassword("");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-md border-primary/20 shadow-2xl bg-card/50">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Sistema Bloqueado</CardTitle>
                    <CardDescription>
                        Sessão pausada por inatividade. Digite sua senha mestra.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="relative">
                            <Input 
                                type="password" 
                                placeholder="Senha Mestra" 
                                className="pl-4 h-12 text-lg"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : <>Desbloquear <ArrowRight className="h-4 w-4" /></>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}