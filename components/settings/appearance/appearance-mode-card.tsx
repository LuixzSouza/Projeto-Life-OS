import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Moon, Sun, Laptop } from "lucide-react";

const MODES = [
  { id: 'light', icon: Sun, label: 'Claro' },
  { id: 'dark', icon: Moon, label: 'Escuro' },
  { id: 'system', icon: Laptop, label: 'Auto' },
] as const;

interface AppearanceModeCardProps {
  theme?: string;
  setTheme: (theme: string) => void;
}

export function AppearanceModeCard({ theme, setTheme }: AppearanceModeCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Modo claro, escuro ou automático.</CardDescription></CardHeader>
      <CardContent className="flex gap-2">
        {MODES.map((mode) => (
          <div key={mode.id} onClick={() => setTheme(mode.id)} className={cn("flex-1 p-3 rounded-lg border-2 cursor-pointer flex flex-col items-center gap-2 transition-all hover:bg-muted", theme === mode.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground")}>
            <mode.icon className={cn("h-5 w-5", theme === mode.id && "fill-primary/20")} />
            <span className="text-xs font-medium">{mode.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
