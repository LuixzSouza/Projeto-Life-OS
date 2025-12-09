"use client";

import { useState } from "react";
import { RoutineItem } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, BookOpen, Dumbbell, Home, Coffee, Briefcase, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedRoutine } from "@/app/(dashboard)/agenda/actions"; // Importe a action
import { toast } from "sonner";

// Helper para ícones e cores
const getCategoryStyle = (cat: string) => {
    switch(cat) {
        case 'health': return { color: 'text-green-500 bg-green-50 dark:bg-green-900/20', icon: Dumbbell };
        case 'study': return { color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', icon: BookOpen };
        case 'work': return { color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', icon: Briefcase };
        case 'home': return { color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20', icon: Home };
        case 'leisure': return { color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20', icon: Coffee };
        default: return { color: 'text-zinc-500 bg-zinc-50', icon: Sun };
    }
};

export function RoutineView({ items }: { items: RoutineItem[] }) {
    // Filtra itens por grupo de dias
    const weekItems = items.filter(i => i.daysOfWeek.includes('mon'));
    const fridayItems = items.filter(i => i.daysOfWeek.includes('fri'));
    const weekendItems = items.filter(i => i.daysOfWeek.includes('sat') || i.daysOfWeek.includes('sun'));

    const handleImport = async () => {
        const res = await seedRoutine();
        if(res.success) toast.success(res.message);
        else toast.info(res.message);
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-xl">
                <h3 className="text-lg font-semibold">Sua rotina ainda não está definida</h3>
                <p className="text-sm text-zinc-500 mb-4">Importe o modelo padrão que você criou.</p>
                <Button onClick={handleImport}>Importar Rotina Padrão</Button>
            </div>
        )
    }

    return (
        <Tabs defaultValue="week" className="w-full">
            <div className="flex items-center justify-between mb-4">
                <TabsList>
                    <TabsTrigger value="week">Seg-Qui</TabsTrigger>
                    <TabsTrigger value="friday">Sexta</TabsTrigger>
                    <TabsTrigger value="weekend">Fim de Semana</TabsTrigger>
                </TabsList>
            </div>

            {/* RENDERIZADOR DE LISTA (Reutilizável) */}
            <RoutineList items={weekItems} value="week" />
            <RoutineList items={fridayItems} value="friday" />
            <RoutineList items={weekendItems} value="weekend" />
        </Tabs>
    );
}

function RoutineList({ items, value }: { items: RoutineItem[], value: string }) {
    return (
        <TabsContent value={value} className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                    {items.map((item) => {
                        const style = getCategoryStyle(item.category);
                        const Icon = style.icon;

                        return (
                            <div key={item.id} className="relative flex gap-4">
                                {/* Linha do Tempo Visual */}
                                <div className="flex flex-col items-center">
                                    <div className={`p-2 rounded-full border ${style.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 my-1 last:hidden"></div>
                                </div>

                                {/* Card de Conteúdo */}
                                <Card className="flex-1 mb-2 hover:border-zinc-300 transition-all">
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {item.startTime} - {item.endTime}
                                                </Badge>
                                                <h4 className="font-bold text-sm">{item.title}</h4>
                                            </div>
                                            <p className="text-xs text-zinc-500">{item.description}</p>
                                        </div>
                                        <Badge className={`w-fit ${style.color} border-none`}>
                                            {item.category.toUpperCase()}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </TabsContent>
    )
}