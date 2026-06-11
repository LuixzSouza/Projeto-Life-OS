// Busca de texto portátil entre dialetos (DATABASE_ROADMAP · catálogo de
// pegadinhas, item nº 1): `contains` é case-insensitive no SQLite (LIKE) e
// CASE-SENSITIVE no Postgres. Sem este helper, toda caixa de busca mudaria de
// comportamento ao migrar de banco ("Mercado" deixaria de achar "mercado").
//
// O truque do tipo: o client canônico (sqlite) não conhece `mode` — mas o
// client DERIVADO de Postgres (que é quem roda de verdade nesse dialeto)
// aceita. O cast esconde o campo do tipo canônico em UM lugar só, exatamente
// como o roadmap pede ("cast acontece em um lugar").

import { getDialect } from "./db-dialect";

/**
 * Filtro `contains` com a MESMA semântica (sem diferenciar caixa) em qualquer
 * dialeto. Uso: `where: { title: containsInsensitive(q) }`.
 */
export function containsInsensitive(q: string): { contains: string } {
  if (getDialect() === "postgres") {
    return { contains: q, mode: "insensitive" } as unknown as { contains: string };
  }
  return { contains: q };
}
