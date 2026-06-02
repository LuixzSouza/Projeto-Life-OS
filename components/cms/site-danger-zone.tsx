"use client";

import { useState } from "react";
import { ManagedSite } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, AlertCircle, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSite } from "@/app/(dashboard)/cms/actions";

export function SiteDangerZone({ site }: { site: ManagedSite }) {
    const router = useRouter();
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleFinalDeleteSite = async () => {
        setIsDeleting(true);
        try {
            await deleteSite(site.id);
            toast.success("Container destruído com sucesso.");
            router.push("/cms");
        } catch {
            toast.error("Erro ao destruir container.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-2xl py-10 mx-auto">
            <Card className="border-red-500/30 bg-red-500/5 shadow-2xl rounded-[2rem]">
                <CardHeader className="p-8 pb-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mb-4">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-red-600 text-xl font-black uppercase tracking-tighter">Destruir Container</CardTitle>
                    <CardDescription className="text-red-600/70 font-medium text-xs mt-2 leading-relaxed">
                        Isso apagará todos os dados atrelados a este projeto e desativará a API Key <code className="font-bold">{site.apiKey.slice(0,8)}...</code> imediatamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <Dialog onOpenChange={(open) => { if (!open) setDeleteConfirmName(""); }}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02]">
                                <Trash2 className="mr-2 h-4 w-4" /> Iniciar Destruição
                            </Button>
                        </DialogTrigger>

                        {/* 🟢 z-[100] adicionado para furar o blur */}
                        <DialogContent className="fixed left-1/2 top-1/2 z-[100] w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-border/40 bg-card p-8 shadow-2xl">
                            <DialogHeader className="flex flex-col items-center text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                                    <ShieldAlert className="h-7 w-7" />
                                </div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">Ação Crítica</DialogTitle>
                                <DialogDescription className="text-sm font-medium py-2">
                                    Para confirmar a exclusão de <span className="font-black text-foreground underline">{site.name}</span>, digite o nome do projeto:
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 mt-2">
                                <Input
                                    value={deleteConfirmName}
                                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                                    placeholder={site.name}
                                    className="h-14 rounded-2xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-red-500/20"
                                />
                                <Button
                                    disabled={deleteConfirmName !== site.name || isDeleting}
                                    onClick={handleFinalDeleteSite}
                                    className="w-full h-14 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-30 transition-all"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "DELETAR PROJETO PERMANENTEMENTE"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}
