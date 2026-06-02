"use client";

import * as React from "react";

interface ThemeColorContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

const ThemeColorContext = React.createContext<ThemeColorContextType>({
  themeColor: "theme-blue",
  setThemeColor: () => {},
});

export function useThemeColor() {
  return React.useContext(ThemeColorContext);
}

const PRESET_CLASSES = ["theme-blue", "theme-green", "theme-orange", "theme-violet", "theme-rose"];

// Converte #rrggbb para o formato "H S% L%" usado pelas variáveis CSS (Tailwind/shadcn).
// Retorna também a luminância para calcular o contraste do texto sobre a cor.
function hexToHslParts(hex: string): { hsl: string; l: number } | null {
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    hsl: `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`,
    l: l * 100,
  };
}

interface ThemeColorProviderProps {
  children: React.ReactNode;
  initialColor?: string; // ✅ Aceita a cor do banco de dados
}

export function ThemeColorProvider({ children, initialColor = "theme-blue" }: ThemeColorProviderProps) {
  const [themeColor, setThemeColorState] = React.useState<string>(initialColor);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    // Se tiver algo salvo no localStorage, tem preferência sobre o banco (opcional)
    const savedColor = localStorage.getItem("theme-color");
    if (savedColor) {
      setThemeColorState(savedColor);
    }
  }, []);

  const setThemeColor = (color: string) => {
    setThemeColorState(color);
    localStorage.setItem("theme-color", color);
  };

  // Aplica a cor (preset OU hex customizado) globalmente no app.
  React.useEffect(() => {
    if (!isMounted) return;
    const root = document.documentElement;

    // Sempre limpa o estado anterior antes de aplicar o novo
    root.classList.remove(...PRESET_CLASSES);
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--primary-foreground");

    if (themeColor.startsWith("#")) {
      // Cor customizada -> injeta variáveis CSS inline (vale para TODO o app).
      // As variáveis aqui guardam a COR COMPLETA (Tailwind v4: var(--primary) é
      // usada direto como cor), então o próprio hex já é um valor válido.
      const parts = hexToHslParts(themeColor);
      if (parts) {
        root.style.setProperty("--primary", themeColor);
        root.style.setProperty("--ring", themeColor);
        // Contraste automático do texto sobre a cor primária
        root.style.setProperty(
          "--primary-foreground",
          parts.l > 60 ? "#18181b" : "#fafafa"
        );
        root.setAttribute("data-theme", "custom");
      } else {
        // Hex inválido -> cai no preset padrão para não quebrar o tema
        root.setAttribute("data-theme", "theme-blue");
        root.classList.add("theme-blue");
      }
    } else {
      // Preset -> usa a classe do globals.css
      root.setAttribute("data-theme", themeColor);
      root.classList.add(themeColor);
    }
  }, [themeColor, isMounted]);

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {/* Aqui aplicamos a classe inicial no servidor para não piscar */}
      <div className={!isMounted ? initialColor : undefined} style={{ display: 'contents' }}>
          {children}
      </div>
    </ThemeColorContext.Provider>
  );
}