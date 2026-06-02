import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";
import { THEME_PRESETS } from "./theme-presets";

interface ThemePaletteCardProps {
  themeColor: string;
  isPreset: boolean;
  customColorInput: string;
  onPresetSelect: (color: string) => void;
  onCustomColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThemePaletteCard({
  themeColor,
  isPreset,
  customColorInput,
  onPresetSelect,
  onCustomColorChange,
}: ThemePaletteCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle>Paleta de Cores</CardTitle>
        <CardDescription>Escolha um preset ou personalize a cor do sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {/* 1. Presets */}
          {THEME_PRESETS.map((color) => (
            <div
              key={color.name}
              className={cn(
                "cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-muted transition-all aspect-square justify-center relative group",
                themeColor === color.name ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30"
              )}
              onClick={() => onPresetSelect(color.name)}
              title={color.label}
            >
              <div className={cn("h-6 w-6 rounded-full shadow-sm ring-2 ring-offset-2 ring-transparent transition-all group-hover:scale-110", color.bg)} />
              {themeColor === color.name && (<div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 animate-in zoom-in"><Check className="h-2 w-2 text-primary-foreground" /></div>)}
            </div>
          ))}

          {/* 2. Seletor Customizado */}
          <div
            className={cn(
              "cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center gap-2 hover:bg-muted transition-all aspect-square justify-center relative group overflow-hidden",
              !isPreset ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30"
            )}
            title="Cor Personalizada"
          >
            <div className="h-6 w-6 rounded-full shadow-sm ring-2 ring-offset-2 ring-transparent group-hover:scale-110 transition-transform flex items-center justify-center overflow-hidden relative">
              {!isPreset ? (
                <div
                  className="w-full h-full border border-black/10"
                  style={{ backgroundColor: customColorInput }}
                />
              ) : (
                <div
                  className="w-full h-full bg-gradient-to-br"
                  style={{ background: "conic-gradient( red, orange, yellow, green, blue, indigo, violet)" }}
                />
              )}

              {isPreset && <Palette className="h-3 w-3 text-white absolute " />}
            </div>

            <input
              type="color"
              value={customColorInput}
              onChange={onCustomColorChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />

            {!isPreset && (
              <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 animate-in zoom-in pointer-events-none">
                <Check className="h-2 w-2 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
