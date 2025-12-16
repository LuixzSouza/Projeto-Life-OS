import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Utensils, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaloriesCardProps {
    weight: number;
    height: number;
    age?: number;
    gender?: 'MALE' | 'FEMALE';
}

export function CaloriesCard({ weight, height, age = 25, gender = 'MALE' }: CaloriesCardProps) {
    // Fallback seguro
    const w = weight || 70;
    const h = height || 170;
    
    // Cálculo TMB (Mifflin-St Jeor)
    const genderOffset = gender === 'MALE' ? 5 : -161;
    const tmb = (10 * w) + (6.25 * h) - (5 * age) + genderOffset;
    
    // Sugestão de Macros (Manutenção)
    const protein = Math.round(w * 2); // 2g/kg
    const fat = Math.round(w * 0.8);   // 0.8g/kg
    const caloriesFromProteinAndFat = (protein * 4) + (fat * 9);
    const carbs = Math.max(0, Math.round((tmb - caloriesFromProteinAndFat) / 4));

    return (
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between group">
            
            {/* Background Decorativo */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-600 dark:text-amber-400">
                        <Flame className="h-3.5 w-3.5" />
                    </div>
                    Metabolismo
                </CardTitle>
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Basal Estimado
                </div>
            </CardHeader>
            
            <CardContent className="relative z-10 space-y-6 flex-1 flex flex-col justify-end">
                
                {/* Valor Principal */}
                <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground tracking-tighter">
                            ~{Math.round(tmb)}
                        </span>
                        <span className="text-sm font-semibold text-muted-foreground">kcal</span>
                    </div>
                    <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20 animate-pulse" />
                </div>
                
                {/* Sugestão de Macros */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                        <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Meta Diária Sugerida
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <MacroBox 
                            label="Proteína" 
                            value={protein} 
                            unit="g" 
                            colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20" 
                        />
                        <MacroBox 
                            label="Carbo" 
                            value={carbs} 
                            unit="g" 
                            colorClass="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        />
                        <MacroBox 
                            label="Gordura" 
                            value={fat} 
                            unit="g" 
                            colorClass="bg-amber-500/10 text-amber-600 border-amber-500/20" 
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}

// Subcomponente MacroBox Refinado
function MacroBox({ label, value, unit, colorClass }: { label: string, value: number, unit: string, colorClass: string }) {
    return (
        <div className={cn(
            "flex flex-col justify-center items-center p-2 rounded-xl border transition-all duration-300 hover:scale-105",
            colorClass
        )}>
            <span className="text-sm font-bold leading-none">
                {value}<span className="text-[10px] opacity-70 ml-0.5 font-medium">{unit}</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-1">
                {label}
            </span>
        </div>
    )
}