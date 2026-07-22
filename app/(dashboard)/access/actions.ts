"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decrypt, encrypt } from "@/lib/crypto";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { calculateStrength } from "@/components/access/access-helpers";

// Consulta HIBP (k-anonymity) para UMA senha — usada ao salvar credencial nova.
// Best-effort com timeout curto: rede fora do ar NUNCA impede o salvamento.
async function pwnedCount(plain: string): Promise<number> {
  try {
    const hash = crypto.createHash("sha1").update(plain).digest("hex").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return 0;
    const body = await res.text();
    const suffix = hash.slice(5);
    const line = body.split("\n").find((l) => l.split(":")[0]?.trim().toUpperCase() === suffix);
    return line ? parseInt(line.split(":")[1]?.trim() || "0", 10) : 0;
  } catch {
    return 0;
  }
}

// --- AUDITORIA DE SEGURANÇA DO COFRE ---
// Decifra as senhas APENAS no servidor para medir força e detectar reuso.
// Retorna somente metadados (força/flags) — NUNCA a senha em texto puro.
export type VaultAudit = {
  strengthById: Record<string, number>;
  reusedIds: string[];
  stats: {
    total: number;
    weak: number;
    medium: number;
    strong: number;
    reused: number;
    healthScore: number; // 0-100
  };
};

export async function getVaultSecurityAudit(): Promise<VaultAudit> {
  const userId = await requireUserId();
  // Só credenciais entram na auditoria — notas (password vazio) não têm senha
  // para medir força/reuso, senão contariam como "frágeis" falsamente.
  const items = await prisma.accessItem.findMany({
    where: { userId, password: { not: "" } },
    select: { id: true, password: true },
  });

  const strengthById: Record<string, number> = {};
  const occurrences = new Map<string, string[]>(); // senha -> ids que a usam

  for (const it of items) {
    let plain = "";
    try {
      plain = decrypt(it.password);
    } catch {
      plain = "";
    }
    strengthById[it.id] = calculateStrength(plain);
    if (plain) {
      const list = occurrences.get(plain) ?? [];
      list.push(it.id);
      occurrences.set(plain, list);
    }
  }

  // Reuso: qualquer senha compartilhada por 2+ itens.
  const reusedIds: string[] = [];
  for (const ids of occurrences.values()) {
    if (ids.length > 1) reusedIds.push(...ids);
  }

  const strengths = Object.values(strengthById);
  const total = strengths.length;
  const weak = strengths.filter((s) => s < 50).length;
  const strong = strengths.filter((s) => s >= 80).length;
  const medium = total - weak - strong;
  const reused = reusedIds.length;

  // Saúde geral: média das forças com penalidade pelo reuso.
  const avg = total ? strengths.reduce((a, b) => a + b, 0) / total : 0;
  const reusePenalty = total ? (reused / total) * 30 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(avg - reusePenalty)));

  return {
    strengthById,
    reusedIds,
    stats: { total, weak, medium, strong, reused, healthScore },
  };
}

// --- VERIFICAÇÃO DE VAZAMENTOS (HaveIBeenPwned) ---
// Usa k-anonymity: enviamos apenas os 5 primeiros caracteres do hash SHA-1 da
// senha; a senha NUNCA sai do servidor. Gratuito e sem chave de API.
export type BreachScan = {
  breachedIds: string[];
  breachCounts: Record<string, number>; // id -> nº de vazamentos conhecidos
  checked: number;
};

export async function scanPasswordBreaches(): Promise<BreachScan> {
  const userId = await requireUserId();
  // Notas (password vazio) não têm senha para checar em vazamentos.
  const items = await prisma.accessItem.findMany({
    where: { userId, password: { not: "" } },
    select: { id: true, password: true },
  });

  // Agrupa por hash para não repetir requisições de senhas iguais.
  const byHash = new Map<string, { prefix: string; suffix: string; ids: string[] }>();
  for (const it of items) {
    let plain = "";
    try {
      plain = decrypt(it.password);
    } catch {
      plain = "";
    }
    if (!plain) continue;
    const hash = crypto.createHash("sha1").update(plain).digest("hex").toUpperCase();
    const key = hash;
    const entry = byHash.get(key) ?? { prefix: hash.slice(0, 5), suffix: hash.slice(5), ids: [] };
    entry.ids.push(it.id);
    byHash.set(key, entry);
  }

  const breachedIds: string[] = [];
  const breachCounts: Record<string, number> = {};
  const rangeCache = new Map<string, string>(); // prefixo -> corpo da resposta

  for (const entry of byHash.values()) {
    try {
      let body = rangeCache.get(entry.prefix);
      if (body === undefined) {
        const res = await fetch(`https://api.pwnedpasswords.com/range/${entry.prefix}`, {
          // Add-Padding mascara o tamanho do resultado (privacidade extra).
          headers: { "Add-Padding": "true" },
          cache: "no-store",
        });
        body = res.ok ? await res.text() : "";
        rangeCache.set(entry.prefix, body);
      }

      // Linhas no formato "SUFFIX:COUNT"; padding injeta COUNT=0 (ignoramos).
      const line = body
        .split("\n")
        .find((l) => l.split(":")[0]?.trim().toUpperCase() === entry.suffix);
      const count = line ? parseInt(line.split(":")[1]?.trim() || "0", 10) : 0;

      if (count > 0) {
        for (const id of entry.ids) {
          breachedIds.push(id);
          breachCounts[id] = count;
        }
      }
    } catch {
      // Falha de rede nesta faixa: ignora e segue para as demais.
    }
  }

  return { breachedIds, breachCounts, checked: items.length };
}

// --- CRIAR ACESSO ---
export async function createAccess(formData: FormData) {
  try {
    const title = (formData.get("title") as string)?.trim();
    const isNote = formData.get("kind") === "NOTE";
    const password = ((formData.get("password") as string) || "").trim();

    if (!title) throw new Error("O título é obrigatório.");
    if (!isNote && !password) throw new Error("A senha é obrigatória para credenciais.");

    // Nota (só texto pra lembrar): guarda password === "" como sentinela — sem
    // criptografia de senha, sem checagem HIBP, sem username/cliente.
    const storedPassword = isNote || !password ? "" : encrypt(password);

    const userId = await requireUserId();

    await prisma.accessItem.create({
      data: {
        title,
        username: isNote ? null : (formData.get("username") as string) || null,
        password: storedPassword,
        url: (formData.get("url") as string) || null,
        category: (formData.get("category") as string) || "OTHERS",
        notes: (formData.get("notes") as string) || null,
        client: isNote ? null : (formData.get("client") as string) || null,
        userId,
      },
    });

    revalidatePath("/access");
    // Aviso pós-salvamento: a senha nova já aparece em vazamentos públicos?
    return { success: true, breachCount: storedPassword ? await pwnedCount(password) : 0 };

  } catch (error) {
    console.error("Erro ao criar:", error);
    throw error instanceof Error ? error : new Error("Falha ao salvar no cofre.");
  }
}

// --- ATUALIZAR ACESSO ---
export async function updateAccess(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const title = (formData.get("title") as string)?.trim();
    const isNote = formData.get("kind") === "NOTE";
    const submittedPassword = ((formData.get("password") as string) || "").trim();

    if (!id || !title) throw new Error("Dados inválidos.");

    const userId = await requireUserId();

    // Busca o item atual para não quebrar a senha se ela não mudou.
    const currentItem = await prisma.accessItem.findFirst({ where: { id, userId }, select: { password: true } });
    if (!currentItem) throw new Error("Item não encontrado");

    // Nota → sem senha. Credencial → re-cifra só quando uma nova senha é digitada
    // (campo vazio na edição = manter a atual, que é cifrada/ilegível no form).
    let finalPassword = currentItem.password;
    let passwordChanged = false;
    if (isNote) {
      finalPassword = "";
    } else if (submittedPassword) {
      finalPassword = encrypt(submittedPassword);
      passwordChanged = true;
    } else if (!currentItem.password) {
      throw new Error("A senha é obrigatória para credenciais.");
    }

    await prisma.accessItem.updateMany({
      where: { id, userId },
      data: {
        title,
        username: isNote ? null : (formData.get("username") as string) || null,
        password: finalPassword,
        url: (formData.get("url") as string) || null,
        category: (formData.get("category") as string) || "OTHERS",
        notes: (formData.get("notes") as string) || null,
        client: isNote ? null : (formData.get("client") as string) || null,
      },
    });

    revalidatePath("/access");
    // Só consulta vazamentos quando a senha realmente mudou.
    return { success: true, breachCount: passwordChanged ? await pwnedCount(submittedPassword) : 0 };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    throw error instanceof Error ? error : new Error("Falha ao atualizar.");
  }
}

// --- DELETAR ---
export async function deleteAccess(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.accessItem.deleteMany({ where: { id, userId } });
    revalidatePath("/access");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    throw new Error("Erro ao deletar.");
  }
}

// --- REVELAR SENHA ---
/**
 * Primeiro nome de quem está logado — só para preencher o "enviado por" nos links
 * de credencial compartilhada (rótulo informativo, não autenticado). Vazio se não
 * houver nome cadastrado.
 */
export async function getShareSenderName(): Promise<string> {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return user?.name?.trim().split(/\s+/)[0] ?? "";
}

export async function revealPassword(id: string) {
    const userId = await requireUserId();
    const item = await prisma.accessItem.findFirst({
        where: { id, userId },
        select: { password: true, title: true }
    });

    if (!item?.password) throw new Error("Senha não encontrada.");

    // Decifrar é o que importa: se falhar, LANÇA. Antes devolvia a string
    // "Erro de Descriptografia", que vazava para a tela — e pior, podia ser
    // embutida num link compartilhado como se fosse a senha real.
    let plain: string;
    try {
        plain = decrypt(item.password);
    } catch {
        throw new Error("Não foi possível decifrar a senha (cofre corrompido ou chave trocada).");
    }

    // Trilha de auditoria é best-effort: cada decifração fica na Linha do Tempo
    // (sem a senha), mas uma falha de log nunca pode derrubar a revelação.
    try {
        await logActivity({
            action: "REVEAL",
            module: "access",
            entityType: "access",
            entityId: id,
            summary: `Acessou a senha de "${item.title}"`,
        });
    } catch { /* log não é crítico */ }

    return plain;
}