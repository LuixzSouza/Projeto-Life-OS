import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Utensils } from "lucide-react";

interface CaloriesCardProps {
    weight: number;
    height: number;
    age?: number;
    gender?: 'MALE' | 'FEMALE';
}

export function CaloriesCard({ weight, height, age = 25, gender = 'MALE' }: CaloriesCardProps) {
    // Valores de segurança para evitar NaN se o usuário não tiver dados
    const w = weight || 70;
    const h = height || 170;
    
    // TMB (Mifflin-St Jeor)
    // Homens: (10 x peso) + (6.25 x altura) - (5 x idade) + 5
    // Mulheres: (10 x peso) + (6.25 x altura) - (5 x idade) - 161
    const genderOffset = gender === 'MALE' ? 5 : -161;
    const tmb = (10 * w) + (6.25 * h) - (5 * age) + genderOffset;
    
    // Sugestão de Macros (Dieta Equilibrada - Manutenção)
    const protein = Math.round(w * 2); // 2g/kg
    const fat = Math.round(w * 0.8);   // 0.8g/kg
    // O restante das calorias vai para carboidratos
    // 1g Prot = 4kcal, 1g Gord = 9kcal, 1g Carb = 4kcal
    const caloriesFromProteinAndFat = (protein * 4) + (fat * 9);
    const carbs = Math.max(0, Math.round((tmb - caloriesFromProteinAndFat) / 4));

    return (
        <Card className="border border-orange-100 dark:border-orange-900 shadow-sm bg-orange-50/50 dark:bg-orange-950/10 h-full flex flex-col justify-between group hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                    <Flame className="h-4 w-4" /> Metabolismo
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <div>
                    <div className="text-4xl font-black text-orange-600 dark:text-orange-400 leading-none">
                        ~{Math.round(tmb)}
                    </div>
                    <p className="text-xs font-medium text-orange-600/70 mt-1 dark:text-orange-400/70">
                        kcal (Basal Estimado)
                    </p>
                </div>
                
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-orange-600/60 dark:text-orange-400/60 uppercase flex items-center gap-1 tracking-wider border-b border-orange-200 dark:border-orange-800/50 pb-1">
                        <Utensils className="h-3 w-3" /> Sugestão Diária
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <MacroBox label="Proteína" value={protein} unit="g" />
                        <MacroBox label="Carbo" value={carbs} unit="g" />
                        <MacroBox label="Gordura" value={fat} unit="g" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function MacroBox({ label, value, unit }: { label: string, value: number, unit: string }) {
    return (
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center items-center">
            <span className="block text-sm text-orange-900 dark:text-orange-100 font-bold leading-tight">
                {value}<span className="text-[10px] font-normal opacity-70 ml-0.5">{unit}</span>
            </span>
            <span className="text-[9px] text-orange-600/70 dark:text-orange-400/70 font-bold uppercase tracking-wider mt-0.5">
                {label}
            </span>
        </div>
    )
}