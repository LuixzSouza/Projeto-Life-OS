// Constantes e helpers de gamificação da página de Estudos.

export const XP_PER_LEVEL = 600;

export interface LevelTheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
}

export const getLevelTheme = (level: number): LevelTheme => {
  if (level >= 50)
    return { bg: "bg-primary", border: "border-primary", text: "text-primary", glow: "bg-primary/25" };
  if (level >= 30)
    return { bg: "bg-primary/80", border: "border-primary/80", text: "text-primary", glow: "bg-primary/20" };
  if (level >= 20)
    return { bg: "bg-primary/70", border: "border-primary/70", text: "text-primary", glow: "bg-primary/15" };
  if (level >= 10)
    return { bg: "bg-primary/60", border: "border-primary/60", text: "text-primary", glow: "bg-primary/10" };
  return { bg: "bg-primary/50", border: "border-primary/50", text: "text-primary", glow: "bg-primary/5" };
};

export const formatHours = (minutes: number) => {
  if (!isFinite(minutes) || minutes <= 0) return "0.0";
  return (minutes / 60).toFixed(1);
};

export const safePercent = (value: number) => {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};
