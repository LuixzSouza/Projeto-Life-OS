import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wheat, Droplets, Activity, Zap, Brain, ShieldCheck } from "lucide-react";

export function MacroEducation() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
      <Card className="bg-blue-500/5 border-blue-200/20 shadow-sm hover:border-blue-500/30 transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-blue-600 flex items-center gap-2">
            <Wheat className="h-4 w-4" /> Carboidratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            <strong>O que é?</strong> A principal fonte de energia do corpo. É o combustível do cérebro e dos músculos.
          </p>
          <div className="flex gap-2 text-[10px] font-medium text-blue-700 bg-blue-100/50 p-2 rounded-lg">
            <Zap className="h-3 w-3" /> 
            <span>Ideal para pré-treino e energia diária.</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/5 border-emerald-200/20 shadow-sm hover:border-emerald-500/30 transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-emerald-600 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Proteínas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            <strong>O que é?</strong> Os tijolos do corpo. Essenciais para construir músculos, pele, cabelo e recuperar tecidos.
          </p>
          <div className="flex gap-2 text-[10px] font-medium text-emerald-700 bg-emerald-100/50 p-2 rounded-lg">
            <ShieldCheck className="h-3 w-3" /> 
            <span>Foco em saciedade e ganho muscular.</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-200/20 shadow-sm hover:border-amber-500/30 transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-amber-600 flex items-center gap-2">
            <Droplets className="h-4 w-4" /> Gorduras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            <strong>O que é?</strong> Reserva de energia e vital para hormônios. Não tema as gorduras boas (azeite, abacate).
          </p>
          <div className="flex gap-2 text-[10px] font-medium text-amber-700 bg-amber-100/50 p-2 rounded-lg">
            <Brain className="h-3 w-3" /> 
            <span>Crucial para o funcionamento hormonal.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}