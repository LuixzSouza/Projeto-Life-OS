"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

export interface GoalTaskData {
  id: string;
  title: string;
  isDone: boolean;
}

export interface GoalData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  targetDate: string | null;
  subjectId: string | null;
  subjectTitle: string | null;
  subjectColor: string | null;
  tasks: GoalTaskData[];
  totalTasks: number;
  doneTasks: number;
  updatedAt: string;
  createdAt: string;
}

export interface GoalSubject {
  id: string;
  title: string;
  color: string | null;
  icon: string | null;
}

function field(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v ? v : null;
}

// Datas de <input type="date">: força meio-dia UTC para evitar o "bug do dia anterior".
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  return new Date(`${raw}T12:00:00Z`);
}

async function resolveSubjectId(formData: FormData, userId: string): Promise<string | null> {
  const subjectId = field(formData, "subjectId");
  if (!subjectId || subjectId === "none") return null;
  const owned = await prisma.studySubject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  return owned ? subjectId : null;
}

/** Lista as metas vivas (não na lixeira), com matéria e subtarefas para o progresso. */
export async function getGoals(): Promise<GoalData[]> {
  const userId = await requireUserId();
  const rows = await prisma.learningGoal.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
    include: {
      subject: { select: { title: true, color: true } },
      tasks: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true, isDone: true } },
    },
  });
  return rows.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    priority: g.priority,
    targetDate: g.targetDate?.toISOString() ?? null,
    subjectId: g.subjectId,
    subjectTitle: g.subject?.title ?? null,
    subjectColor: g.subject?.color ?? null,
    tasks: g.tasks,
    totalTasks: g.tasks.length,
    doneTasks: g.tasks.filter((t) => t.isDone).length,
    updatedAt: g.updatedAt.toISOString(),
    createdAt: g.createdAt.toISOString(),
  }));
}

export async function getGoalSubjects(): Promise<GoalSubject[]> {
  const userId = await requireUserId();
  return prisma.studySubject.findMany({
    where: { userId },
    orderBy: { title: "asc" },
    select: { id: true, title: true, color: true, icon: true },
  });
}

/** Concluir/reabrir a meta em 1 clique, direto do card (sem abrir o diálogo). */
export async function setGoalStatus(id: string, status: "IN_PROGRESS" | "DONE"): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.learningGoal.updateMany({ where: { id, userId, deletedAt: null }, data: { status } });
    if (status === "DONE") {
      const goal = await prisma.learningGoal.findFirst({ where: { id, userId }, select: { title: true } });
      await logActivity({
        action: "COMPLETE",
        module: "studies",
        entityType: "goal",
        entityId: id,
        summary: goal ? `Concluiu a meta "${goal.title}"` : "Concluiu uma meta",
      });
    }
    revalidatePath("/goals");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function createGoal(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const title = field(formData, "title");
    if (!title) return { success: false, message: "O título é obrigatório." };

    const subjectId = await resolveSubjectId(formData, userId);
    const priority = Number(formData.get("priority")) || 3;

    const created = await prisma.learningGoal.create({
      data: {
        userId,
        title,
        description: field(formData, "description"),
        status: field(formData, "status") ?? "IN_PROGRESS",
        priority,
        targetDate: parseDate(field(formData, "targetDate")),
        subjectId,
      },
    });

    await logActivity({
      action: "CREATE",
      module: "studies",
      entityType: "goal",
      entityId: created.id,
      summary: `Criou a meta "${created.title}"`,
    });

    revalidatePath("/goals");
    return { success: true, message: "Meta criada." };
  } catch (error) {
    console.error("Erro ao criar meta:", error);
    return { success: false, message: "Falha ao criar a meta." };
  }
}

export async function updateGoal(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const id = field(formData, "id");
    const title = field(formData, "title");
    if (!id || !title) return { success: false, message: "Dados inválidos." };

    const subjectId = await resolveSubjectId(formData, userId);
    const priority = Number(formData.get("priority")) || 3;

    await prisma.learningGoal.updateMany({
      where: { id, userId },
      data: {
        title,
        description: field(formData, "description"),
        status: field(formData, "status") ?? "IN_PROGRESS",
        priority,
        targetDate: parseDate(field(formData, "targetDate")),
        subjectId,
      },
    });

    revalidatePath("/goals");
    return { success: true, message: "Meta atualizada." };
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return { success: false, message: "Falha ao atualizar a meta." };
  }
}

/** Soft-delete: a meta vai para a Lixeira. As subtarefas seguem juntas (cascade no purge). */
export async function deleteGoal(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const goal = await prisma.learningGoal.findFirst({ where: { id, userId, deletedAt: null }, select: { title: true } });
    await prisma.learningGoal.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });

    await logActivity({
      action: "DELETE",
      module: "studies",
      entityType: "goal",
      entityId: id,
      summary: goal ? `Moveu a meta "${goal.title}" para a lixeira` : "Removeu uma meta",
    });

    revalidatePath("/goals");
    return { success: true, message: "Meta movida para a lixeira." };
  } catch (error) {
    console.error("Erro ao excluir meta:", error);
    return { success: false, message: "Falha ao excluir a meta." };
  }
}

// --- SUBTAREFAS (LearningTask) ---

export async function addGoalTask(goalId: string, title: string): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    const clean = title.trim();
    if (!clean) return { success: false };
    // Garante que a meta pertence ao usuário e não está na lixeira.
    const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, userId, deletedAt: null }, select: { id: true } });
    if (!goal) return { success: false };

    const count = await prisma.learningTask.count({ where: { goalId } });
    await prisma.learningTask.create({ data: { goalId, userId, title: clean, orderIndex: count } });
    revalidatePath("/goals");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// --- SUGESTÃO DE PASSOS COM IA (one-shot, com fallback local) ---

/** Normaliza um título de passo para comparar duplicatas (caixa/acentos/pontuação). */
function stepKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai 3–7 passos da resposta da IA (um por linha, sem numeração/bullets). */
function parseSuggestedSteps(text: string): string[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length >= 5 && l.length <= 140);
  if (lines.length < 2) return null;
  return lines.slice(0, 7);
}

/** Decomposição padrão quando a IA não está configurada: destravar > planejar perfeito. */
function defaultGoalSteps(title: string): string[] {
  return [
    `Mapear o que você já sabe e o que falta para "${title}"`,
    "Separar o melhor material de estudo (curso, livro ou docs)",
    "Estudar o fundamento principal por 25 minutos",
    "Fazer um exercício prático pequeno aplicando o que viu",
    "Revisar e anotar as 3 ideias mais importantes",
  ];
}

export interface SuggestStepsResult {
  success: boolean;
  created: number;
  viaAi: boolean;
  message: string;
}

/**
 * Quebra a meta em passos concretos via IA (one-shot) e grava como LearningTasks.
 * Anti-duplicata: passos com título equivalente aos já existentes são pulados.
 */
export async function suggestGoalSteps(goalId: string): Promise<SuggestStepsResult> {
  try {
    const userId = await requireUserId();
    const goal = await prisma.learningGoal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
      include: {
        subject: { select: { title: true } },
        tasks: { select: { title: true } },
      },
    });
    if (!goal) return { success: false, created: 0, viaAi: false, message: "Meta não encontrada." };

    const system =
      "Você quebra metas de aprendizado em passos concretos e executáveis. " +
      "Responda APENAS com os passos, um por linha, sem numeração, bullets ou comentários. " +
      "Regras: 4 a 6 passos; cada um começa com um verbo no infinitivo; ordem do fundamento ao avançado; " +
      "cada passo cabe numa sessão de estudo (até ~1h); máximo de 120 caracteres por passo; português do Brasil.";
    const context = [
      `Meta: "${goal.title}"`,
      goal.description ? `Descrição: ${goal.description.slice(0, 400)}` : null,
      goal.subject?.title ? `Matéria: ${goal.subject.title}` : null,
      goal.tasks.length > 0 ? `Passos que JÁ existem (não repita): ${goal.tasks.map((t) => t.title).join("; ").slice(0, 400)}` : null,
    ].filter(Boolean).join("\n");

    const aiText = await runOneShotAi(userId, system, context);
    const viaAi = !!aiText;
    const suggested = (aiText && parseSuggestedSteps(aiText)) || defaultGoalSteps(goal.title);

    // Anti-duplicata contra os passos existentes (e entre as próprias sugestões).
    const seen = new Set(goal.tasks.map((t) => stepKey(t.title)));
    const fresh = suggested.filter((s) => {
      const key = stepKey(s);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fresh.length === 0) {
      return { success: true, created: 0, viaAi, message: "Nada novo a adicionar — os passos sugeridos já existem." };
    }

    const base = goal.tasks.length;
    await prisma.$transaction(
      fresh.map((title, i) =>
        prisma.learningTask.create({
          data: { goalId: goal.id, userId, title: title.slice(0, 140), orderIndex: base + i },
          // No modo réplica, ler DateTime dentro de $transaction quebra — devolve só o id.
          select: { id: true },
        }),
      ),
    );

    revalidatePath("/goals");
    return {
      success: true,
      created: fresh.length,
      viaAi,
      message: `${fresh.length} passo${fresh.length > 1 ? "s" : ""} adicionado${fresh.length > 1 ? "s" : ""}${viaAi ? " pela sua IA" : " (modelo padrão — configure a IA para sugestões personalizadas)"}.`,
    };
  } catch (error) {
    console.error("Erro ao sugerir passos da meta:", error);
    return { success: false, created: 0, viaAi: false, message: "Falha ao sugerir passos." };
  }
}

export async function toggleGoalTask(taskId: string, current: boolean): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.learningTask.updateMany({ where: { id: taskId, userId }, data: { isDone: !current } });
    revalidatePath("/goals");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteGoalTask(taskId: string): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    await prisma.learningTask.deleteMany({ where: { id: taskId, userId } });
    revalidatePath("/goals");
    return { success: true };
  } catch {
    return { success: false };
  }
}
