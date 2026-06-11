"use server";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { containsInsensitive } from "@/lib/db-text";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

// =========================================================
// ADVOGADO DO DIABO (#17, Fase 4)
// =========================================================
// Quando um balde do orçamento estoura, o sistema NÃO dá sermão genérico:
// resgata os argumentos que o PRÓPRIO usuário declarou (metas da wishlist,
// com valor faltante e data projetada) e confronta a desculpa atual com eles.
// Com IA configurada o confronto é redigido pelo modelo; sem IA, um texto
// determinístico com a mesma matemática faz o papel.

export interface AdvocateGoal {
  name: string;
  remaining: number;
  /** Meses até a meta no ritmo atual (null = sem ritmo). */
  monthsAway: number | null;
}

export interface AdvocateInput {
  bucketLabel: string;
  over: number;
  spent: number;
  limit: number;
  avgMonthlySavings: number;
  goals: AdvocateGoal[];
}

export interface AdvocateVerdict {
  text: string;
  source: "ai" | "local";
}

function money(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Confronto determinístico (sem IA): só a matemática dos argumentos do usuário. */
function localVerdict(input: AdvocateInput): string {
  const lines: string[] = [];
  lines.push(
    `O balde "${input.bucketLabel}" estourou em ${money(input.over)} (${money(input.spent)} de ${money(input.limit)}).`,
  );
  if (input.avgMonthlySavings > 0) {
    const delayDays = Math.ceil(input.over / (input.avgMonthlySavings / 30));
    lines.push(`No seu ritmo de poupança (~${money(input.avgMonthlySavings)}/mês), esse estouro custa ~${delayDays} dia(s) de avanço rumo às SUAS metas.`);
  }
  for (const g of input.goals.slice(0, 3)) {
    lines.push(
      `• Você declarou que quer "${g.name}" — faltam ${money(g.remaining)}${
        g.monthsAway != null ? ` (~${g.monthsAway} mês(es) no ritmo atual)` : ""
      }. Cada estouro empurra essa data.`,
    );
  }
  lines.push("A pergunta não é se você pode gastar — é se esse gasto vale mais do que aquilo que você mesmo disse que queria.");
  return lines.join("\n\n");
}

export async function getDevilsAdvocate(input: AdvocateInput): Promise<AdvocateVerdict> {
  const userId = await requireUserId();
  const fallback = localVerdict(input);

  // Munição extra: trechos recentes do diário/notas onde o usuário fala de metas
  // (os "argumentos passados" do roadmap). Best-effort — sem nada, segue só a matemática.
  let quotes = "";
  try {
    const notes = await prisma.studyNote.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { content: containsInsensitive("meta") },
          { content: containsInsensitive("objetivo") },
          { tags: containsInsensitive("diário") },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { title: true, content: true },
    });
    quotes = notes
      .map((n) => `«${n.title}»: ${n.content.replace(/\s+/g, " ").slice(0, 280)}`)
      .join("\n");
  } catch {
    quotes = "";
  }

  const system = `Você é o "Advogado do Diabo" do Life OS: confronta o usuário com os argumentos DELE MESMO, sem moralismo genérico.
Regras: responda em português, máximo 120 palavras, tom direto e respeitoso (sem humilhar), use os números fornecidos, termine com UMA pergunta incisiva. Não invente dados.`;

  const user = `Estouro de orçamento agora:
- Balde "${input.bucketLabel}": gastou ${money(input.spent)} de ${money(input.limit)} (${money(input.over)} acima).
- Poupança média: ${money(input.avgMonthlySavings)}/mês.
Metas que EU declarei:
${input.goals.map((g) => `- ${g.name}: faltam ${money(g.remaining)}${g.monthsAway != null ? `, ~${g.monthsAway} mês(es) no ritmo atual` : ""}`).join("\n") || "- (nenhuma meta cadastrada)"}
${quotes ? `Coisas que EU escrevi recentemente:\n${quotes}` : ""}
Me confronte com meus próprios argumentos sobre este estouro.`;

  const aiText = await runOneShotAi(userId, system, user);
  return aiText ? { text: aiText, source: "ai" } : { text: fallback, source: "local" };
}
