// src/lib/utils/date.utils.ts
import { startOfDay, startOfMonth } from "date-fns";

/**
 * Constante para evitar números mágicos em conversões de milissegundos para dias.
 */
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Retorna a data atual padronizada na meia-noite local do servidor/cliente, 
 * mitigando variações de fuso horário e erros de hidratação.
 */
export function getNormalizedToday(): Date {
  return startOfDay(new Date());
}

/**
 * Retorna o primeiro instante do mês atual (meia-noite local do dia 1).
 * Usado para que os KPIs "do mês" do dashboard batam com os buckets mensais
 * da página de Finanças (que usam o mesmo início de mês local).
 */
export function getStartOfMonth(ref: Date = new Date()): Date {
  return startOfMonth(ref);
}

/**
 * Normaliza uma entrada de data desconhecida (string ou Date) para um objeto Date seguro.
 * Retorna null se a data for inválida.
 */
export function parseSafeDate(dateInput: Date | string | null | undefined): Date | null {
  if (!dateInput) return null;
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}