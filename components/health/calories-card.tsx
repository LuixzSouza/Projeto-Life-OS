import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Utensils } from "lucide-react";

export function CaloriesCard({ weight, height }: { weight: number, height: number }) {
    // TMB (Mifflin-St Jeor)
    const tmb = (10 * weight) + (6.25 * height) - (5 * 25) + 5;
    
    // Sugestão de Macros (Dieta Equilibrada - Manutenção)
    // Proteína: 2g/kg
    // Gordura: 0.8g/kg
    // Carbo: Resto
    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 0.8);
    const carbs = Math.round((tmb - (protein * 4) - (fat * 9)) / 4);

    return (
        <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/20 ring-1 ring-orange-100 dark:ring-orange-900 flex flex-col justify-between">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <Flame className="h-4 w-4" /> Metabolismo & Macros
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-4">
                    ~{Math.round(tmb)}<span className="text-sm font-normal opacity-70">kcal (Basal)</span>
                </div>
                
                <div className="space-y-2">
                    <p className="text-xs font-bold text-orange-600/70 uppercase flex items-center gap-1">
                        <Utensils className="h-3 w-3" /> Sugestão Diária
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/50 dark:bg-black/20 rounded p-1">
                            <span className="block text-xs text-orange-800 dark:text-orange-200 font-bold">{protein}g</span>
                            <span className="text-[10px] text-orange-600/60">Prot.</span>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded p-1">
                            <span className="block text-xs text-orange-800 dark:text-orange-200 font-bold">{carbs}g</span>
                            <span className="text-[10px] text-orange-600/60">Carbo</span>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded p-1">
                            <span className="block text-xs text-orange-800 dark:text-orange-200 font-bold">{fat}g</span>
                            <span className="text-[10px] text-orange-600/60">Gord.</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}