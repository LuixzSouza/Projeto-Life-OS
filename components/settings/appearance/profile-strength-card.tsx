import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface ProfileStrengthCardProps {
  name: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  pixKey: string;
}

/**
 * Medidor de completude do perfil — recalcula AO VIVO conforme o usuário
 * preenche o formulário (recebe os states, não os valores do banco).
 */
export function ProfileStrengthCard({ name, avatarUrl, coverUrl, bio, pixKey }: ProfileStrengthCardProps) {
  const items = [
    { label: "Nome", done: name.trim() !== "" },
    { label: "Foto de perfil", done: avatarUrl !== "" },
    { label: "Capa", done: coverUrl !== "" },
    { label: "Bio", done: bio.trim() !== "" },
    { label: "Chave Pix", done: pixKey.trim() !== "" },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  const nextStep = items.find((i) => !i.done);

  // Anel de progresso SVG (r=26 → circunferência ≈ 163.4)
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card className="border-border/40 shadow-sm bg-card">
      <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle
              cx="32" cy="32" r={radius} fill="none" strokeWidth="6"
              stroke="currentColor" className="text-muted"
            />
            <circle
              cx="32" cy="32" r={radius} fill="none" strokeWidth="6" strokeLinecap="round"
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
              className="text-primary transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black tabular-nums text-foreground">
            {percent}%
          </span>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
            Força do Perfil
            {percent === 100 && <Sparkles className="h-4 w-4 text-amber-500" />}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {percent === 100
              ? "Perfil completo — o sistema inteiro fica mais seu."
              : `Próximo passo: adicionar ${nextStep?.label}.`}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 shrink-0 max-w-xs">
          {items.map((item) => (
            <span
              key={item.label}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors",
                item.done
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted/40 text-muted-foreground border-border/40"
              )}
            >
              {item.done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
