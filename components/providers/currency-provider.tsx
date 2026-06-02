"use client";

import * as React from "react";
import { formatCurrency, currencySymbol } from "@/lib/utils";

// Disponibiliza a moeda escolhida pelo usuário (Configurações > Regional) para
// todos os componentes-cliente. A moeda inicial vem do servidor (root layout)
// para evitar flash/hidratação inconsistente.
const CurrencyContext = React.createContext<string>("BRL");

export function useCurrency(): string {
  return React.useContext(CurrencyContext);
}

// Hook de conveniência: retorna um formatador já vinculado à moeda do usuário.
// Uso: const fmt = useFormatCurrency(); fmt(1234.5) -> "R$ 1.234,50"
export function useFormatCurrency() {
  const currency = useCurrency();
  return React.useCallback(
    (value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) =>
      formatCurrency(value, { currency, ...options }),
    [currency]
  );
}

// Retorna apenas o símbolo da moeda do usuário (ex: "R$").
export function useCurrencySymbol(): string {
  return currencySymbol(useCurrency());
}

export function CurrencyProvider({
  currency = "BRL",
  children,
}: {
  currency?: string;
  children: React.ReactNode;
}) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}
