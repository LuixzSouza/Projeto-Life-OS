"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

interface SmartViewContextValue {
  /** Quando true, valores monetários sensíveis ficam ocultos/borrados. */
  smartView: boolean;
  toggle: () => void;
  setSmartView: (value: boolean) => void;
}

const STORAGE_KEY = "life-os-smartview";

// Default seguro: se algum componente usar o hook fora do provider, não quebra.
const SmartViewContext = createContext<SmartViewContextValue>({
  smartView: false,
  toggle: () => {},
  setSmartView: () => {},
});

export function useSmartView(): SmartViewContextValue {
  return useContext(SmartViewContext);
}

export function SmartViewProvider({ children }: { children: React.ReactNode }) {
  const [smartView, setState] = useState(false);

  // Recupera a preferência da sessão (persiste entre navegações)
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") setState(true);
    } catch {
      // localStorage indisponível — ignora
    }
  }, []);

  const persist = (value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignora
    }
  };

  const setSmartView = useCallback((value: boolean) => {
    setState(value);
    persist(value);
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ smartView, toggle, setSmartView }),
    [smartView, toggle, setSmartView]
  );

  return <SmartViewContext.Provider value={value}>{children}</SmartViewContext.Provider>;
}
