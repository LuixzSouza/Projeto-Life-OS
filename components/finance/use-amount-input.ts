"use client";

import { useState, useRef, useEffect, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Encapsula a lógica de um input monetário pt-BR.
 * Guarda os centavos como string de dígitos ("131031" => R$ 1.310,31),
 * expõe o valor formatado (visível) e o valor cru com ponto decimal (envio ao servidor).
 */
export function useAmountInput(initialAmount?: number | null) {
  // --- AMOUNT: armazenamos os centavos como string ("131031" => R$ 1.310,31)
  const [amountDigits, setAmountDigits] = useState<string>(() => {
    if (initialAmount === undefined || initialAmount === null) return "";
    const cents = Math.round(Number(initialAmount) * 100);
    return String(cents);
  });

  // derived values
  const rawAmount: string = amountDigits
    ? (Number(amountDigits) / 100).toFixed(2)
    : "";
  const formattedAmount: string = amountDigits
    ? new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(rawAmount))
    : "";

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Mantém o cursor no final (melhora UX em inputs formatados)
  useEffect(() => {
    const el = amountInputRef.current;
    if (!el) return;
    // pequeno timeout para garantir que o valor já foi aplicado ao DOM
    const t = window.setTimeout(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
    return () => window.clearTimeout(t);
  }, [formattedAmount]);

  // alterações no input visível: pegamos apenas dígitos (centavos)
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    // limite opcional pra evitar overflow no campo (12 dígitos = até bilhões)
    setAmountDigits(onlyDigits.slice(0, 12));
  };

  // cola: limpa tudo que não é dígito
  const handleAmountPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const onlyDigits = text.replace(/\D/g, "");
    if (!onlyDigits) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setAmountDigits(onlyDigits.slice(0, 12));
  };

  // tecla: permite dígitos e teclas de navegação/remoção
  const handleAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const allowed = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];
    if (allowed.includes(e.key)) return;
    if (/^\d$/.test(e.key)) return;
    // permitir também '.' e ',' para quem digitar separador — vamos ignorar e formatar
    if (e.key === "." || e.key === ",") {
      // previne inserir o caractere direto no campo (pois trabalhamos com dígitos)
      e.preventDefault();
      return;
    }
    e.preventDefault();
  };

  return {
    amountInputRef,
    rawAmount,
    formattedAmount,
    handleAmountChange,
    handleAmountPaste,
    handleAmountKeyDown,
  };
}
