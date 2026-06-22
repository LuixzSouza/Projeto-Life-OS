"use client";

import { useState } from "react";
import { ManagedSite } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from "@/components/ui/dialog";
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
            <Card className="border-red-500/30 bg-red-500/5 shadow-sm rounded-2xl">
                <CardHeader className="p-8 pb-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mb-4">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-red-600 text-xl font-bold tracking-tight">Excluir container</CardTitle>
                    <CardDescription className="text-red-600/70 font-medium text-sm mt-2 leading-relaxed">
                        Isso apagará todos os dados atrelados a este projeto e desativará a API Key <code className="font-mono font-bold">{site.apiKey.slice(0,8)}...</code> imediatamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <Dialog onOpenChange={(open) => { if (!open) setDeleteConfirmName(""); }}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full h-12 rounded-xl font-semibold shadow-sm transition-all hover:scale-[1.02]">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir container
                            </Button>
                        </DialogTrigger>

                        <DialogContent size="md">
                            <DialogHeader className="flex flex-col items-center text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-3">
                                    <ShieldAlert className="h-7 w-7" />
                                </div>
                                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Ação crítica</DialogTitle>
                                <DialogDescription>
                                    Para confirmar a exclusão de <span className="font-bold text-foreground">{site.name}</span>, digite o nome do projeto:
                                </DialogDescription>
                            </DialogHeader>
                            <DialogBody>
                                <Input
                                    value={deleteConfirmName}
                                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                                    placeholder={site.name}
                                    className="h-14 rounded-2xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-red-500/20"
                                />
                            </DialogBody>
                            <DialogFooter>
                                <Button
                                    disabled={deleteConfirmName !== site.name || isDeleting}
                                    onClick={handleFinalDeleteSite}
                                    className="w-full h-14 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-semibold shadow-sm disabled:opacity-30 transition-all"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir projeto permanentemente"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}
