"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoonStar, Plus } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";

export function SleepCard({ value }: { value: number | string }) {
    const handleSave = async (formData: FormData) => {
        await logMetric(formData);
        toast.success("Sono registrado! 💤");
    };

    return (
        <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-950/20 ring-1 ring-indigo-100 dark:ring-indigo-900 p-4">
            <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full text-indigo-600 dark:text-indigo-300">
                        <MoonStar className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">Sono Recente</p>
                        <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">{value} <span className="text-xs font-normal opacity-70">horas</span></p>
                    </div>
                </div>
                
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Registrar Sono</DialogTitle></DialogHeader>
                        <form action={handleSave} className="space-y-4">
                            <input type="hidden" name="type" value="SLEEP" />
                            <div className="space-y-2">
                                <Label>Horas dormidas</Label>
                                <Input name="value" type="number" step="0.1" placeholder="7.5" required autoFocus />
                            </div>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </Card>
    )
}