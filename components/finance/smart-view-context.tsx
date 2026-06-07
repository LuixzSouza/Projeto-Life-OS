"use client";

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";

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

// --- Store externo (localStorage) lido via useSyncExternalStore ---------------
// Ler de forma síncrona evita o flash de hidratação que o padrão useEffect+setState
// causava (e o aviso react-hooks/set-state-in-effect). Bônus: sincroniza entre abas.
const listeners = new Set<() => void>();

function readStore(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false; // localStorage indisponível
  }
}

function writeStore(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignora
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // Reflete mudanças feitas em OUTRAS abas (o evento "storage" não dispara na própria).
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function SmartViewProvider({ children }: { children: ReactNode }) {
  // getServerSnapshot = false: no SSR/hidratação o valor é estável (sem mismatch);
  // logo após a hidratação o React re-renderiza com a preferência real do cliente.
  const smartView = useSyncExternalStore(subscribe, readStore, () => false);

  const setSmartView = useCallback((value: boolean) => writeStore(value), []);
  const toggle = useCallback(() => writeStore(!readStore()), []);

  const value = useMemo(
    () => ({ smartView, toggle, setSmartView }),
    [smartView, toggle, setSmartView]
  );

  return <SmartViewContext.Provider value={value}>{children}</SmartViewContext.Provider>;
}
