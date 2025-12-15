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

  // Aplica a classe no HTML ou Body
  React.useEffect(() => {
    if (!isMounted) return;
    const root = document.documentElement; // ou document.body
    
    // Remove cores antigas
    root.classList.remove("theme-blue", "theme-green", "theme-orange", "theme-violet", "theme-rose");
    
    // Adiciona atributos para CSS funcionar
    root.setAttribute("data-theme", themeColor);
    root.classList.add(themeColor);
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