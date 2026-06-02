"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createPage } from "@/app/(dashboard)/cms/actions";

export function NewPageForm({ siteId }: { siteId: string }) {
    return (
        <div className="max-w-xl mx-auto py-10">
            <Card className="border-border/40 shadow-xl rounded-[2rem] bg-card overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/40 p-8 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 border border-primary/20">
                        <Plus className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Inicializar Rota</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <form action={async (fd) => {
                        await createPage(fd);
                        toast.success("Build completo!");
                    }} className="space-y-6">
                        <input type="hidden" name="siteId" value={siteId} />
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Caminho do Endpoint</Label>
                            <div className="flex items-center bg-muted/20 border border-border/50 rounded-xl shadow-inner p-1 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-12">
                                <span className="pl-4 pr-2 font-mono text-muted-foreground font-bold text-lg">/</span>
                                <Input name="slug" placeholder="ex: v1-posts" className="border-none bg-transparent shadow-none font-mono font-bold text-lg focus-visible:ring-0" required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20">
                            Provisionar Endpoint
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
