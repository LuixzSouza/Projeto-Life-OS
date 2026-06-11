"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, hashPassword, verifyPassword, logout, login } from "@/lib/auth";
import { validatePasswordStrength } from "@/lib/password-policy";
import { setRegistrationOpen } from "@/lib/db-config";
import { wipeUserData } from "@/lib/full-backup";

// ============================================================================
// SEGURANÇA E FACTORY RESET
// ============================================================================

/**
 * Troca a senha mestra. Exige a SENHA ATUAL correta (defense-in-depth: uma
 * sessão aberta não pode trocar a senha sem conhecê-la), recusa repetir a mesma
 * senha e, ao final, encerra a sessão atual — o usuário reentra com a nova senha.
 */
export async function changePassword(formData: FormData) {
  const currentPassword = (formData.get("currentPassword") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";

  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message!);
  }

  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado.");

  const currentOk = await verifyPassword(currentPassword, user.password);
  if (!currentOk) {
    throw new Error("Senha atual incorreta.");
  }

  // Evita troca "vazia" (mesma senha) — reforça que houve uma mudança real.
  const isSame = await verifyPassword(newPassword, user.password);
  if (isSame) {
    throw new Error("A nova senha deve ser diferente da atual.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(newPassword) },
  });

  // Invalida a sessão atual (cookie apagado): o usuário reentra com a nova senha.
  await logout();
  revalidatePath("/");
}

/**
 * Desconecta TODOS os outros dispositivos: incrementa User.tokenVersion (todo
 * JWT antigo passa a ser rejeitado pelo getSession) e reemite o cookie apenas
 * desta sessão, que continua válida. Registra o evento na aba Segurança.
 */
export async function disconnectOtherDevices(): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();

    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    // Reemite o cookie do dispositivo atual já com a nova versão.
    await login(userId);

    // Best-effort: aparece em "Últimos acessos" como evento de revogação.
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "REVOKE",
          module: "auth",
          summary: "Desconectou os outros dispositivos",
        },
      });
    } catch {
      /* log nunca trava a revogação */
    }

    revalidatePath("/settings");
    return { success: true, message: "Outros dispositivos desconectados. Esta sessão continua ativa." };
  } catch (error) {
    console.error("Erro ao desconectar dispositivos:", error);
    return { success: false, message: "Falha ao desconectar os outros dispositivos." };
  }
}

export async function factoryReset() {
  try {
    // Apaga SOMENTE os dados do usuário logado. A ordem filho→pai vive no
    // registro central de lib/full-backup.ts (cobre 100% dos models —
    // o factory reset antigo esquecia Notebook, Habit, Meeting, Tag, etc.).
    const userId = await requireUserId();
    await wipeUserData(userId);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro no Factory Reset:", error);
    throw new Error("Falha ao apagar dados.");
  }
}

// ============================================================================
// EXCLUSÃO SELETIVA POR MÓDULO (Zona de Perigo)
// ============================================================================
// Apaga DEFINITIVAMENTE os dados de módulos escolhidos, escopado ao usuário.
// Cada módulo deleta na ordem filho→pai para respeitar as FKs. Diferente do
// Factory Reset (que apaga tudo), aqui o usuário escolhe o que zerar.

/** Rótulos para a mensagem de retorno (a UI tem sua própria cópia da lista). */
const DELETABLE_MODULES: { id: string; label: string }[] = [
  { id: "tasks", label: "Tarefas & Projetos" },
  { id: "finance", label: "Finanças" },
  { id: "agenda", label: "Agenda & Rotinas" },
  { id: "studies", label: "Estudos & Flashcards" },
  { id: "health", label: "Saúde & Treinos" },
  { id: "crm", label: "Negócios & Clientes" },
  { id: "connections", label: "Conexões" },
  { id: "entertainment", label: "Entretenimento" },
  { id: "wardrobe", label: "Closet" },
  { id: "links", label: "Links Salvos" },
  { id: "ai", label: "Conversas com a IA" },
  { id: "vault", label: "Cofre de Acessos" },
  { id: "sites", label: "Sites Gerenciados" },
];

export async function deleteModuleData(
  modules: string[]
): Promise<{ success: boolean; message: string; deleted: number }> {
  const userId = await requireUserId();
  const scope = { where: { userId } };

  // Ordem filho→pai dentro de cada módulo para não violar FKs.
  const deleters: Record<string, () => Promise<void>> = {
    tasks: async () => {
      await prisma.task.deleteMany(scope);
      await prisma.jobApplication.deleteMany(scope);
      await prisma.project.deleteMany(scope);
    },
    finance: async () => {
      await prisma.transaction.deleteMany(scope);
      await prisma.recurringExpense.deleteMany(scope);
      await prisma.recurringCharge.deleteMany(scope);
      await prisma.account.deleteMany(scope);
    },
    agenda: async () => {
      await prisma.event.deleteMany(scope);
      await prisma.routineItem.deleteMany(scope);
    },
    studies: async () => {
      await prisma.flashcard.deleteMany(scope);
      await prisma.flashcardDeck.deleteMany(scope);
      await prisma.learningTask.deleteMany(scope);
      await prisma.studyNote.deleteMany(scope);
      await prisma.studyContent.deleteMany(scope);
      await prisma.studySession.deleteMany(scope);
      await prisma.learningGoal.deleteMany(scope);
      await prisma.studySubject.deleteMany(scope);
    },
    health: async () => {
      await prisma.workout.deleteMany(scope);
      await prisma.healthMetric.deleteMany(scope);
      await prisma.bodyMeasurement.deleteMany(scope);
      await prisma.meal.deleteMany(scope);
      await prisma.mealPlan.deleteMany(scope);
    },
    crm: async () => {
      await prisma.invoice.deleteMany(scope);
      await prisma.billing.deleteMany(scope);
      await prisma.client.deleteMany(scope);
    },
    connections: async () => {
      await prisma.friend.deleteMany(scope);
    },
    entertainment: async () => {
      await prisma.mediaItem.deleteMany(scope);
      await prisma.wishlistItem.deleteMany(scope);
    },
    wardrobe: async () => {
      await prisma.wardrobeItem.deleteMany(scope);
    },
    links: async () => {
      await prisma.savedLink.deleteMany(scope);
    },
    ai: async () => {
      await prisma.aiMessage.deleteMany(scope);
      await prisma.aiChat.deleteMany(scope);
    },
    vault: async () => {
      await prisma.accessItem.deleteMany(scope);
    },
    sites: async () => {
      await prisma.sitePage.deleteMany(scope);
      await prisma.managedSite.deleteMany(scope);
    },
  };

  const valid = modules.filter((m) => deleters[m]);
  if (valid.length === 0) {
    return { success: false, message: "Nenhum módulo válido selecionado.", deleted: 0 };
  }

  try {
    for (const m of valid) {
      await deleters[m]();
    }
    revalidatePath("/");
    const labels = valid
      .map((id) => DELETABLE_MODULES.find((d) => d.id === id)?.label ?? id)
      .join(", ");
    return {
      success: true,
      message: `Dados apagados: ${labels}.`,
      deleted: valid.length,
    };
  } catch (error) {
    console.error("Erro ao apagar módulo:", error);
    return { success: false, message: "Falha ao apagar os dados selecionados.", deleted: 0 };
  }
}

/**
 * Liga/desliga o cadastro de novas contas (/register) nesta instância.
 * Uso pessoal → desligado; quando quiser deixar um amigo testar → ligado.
 */
export async function setRegistrationPolicy(open: boolean): Promise<{ success: boolean; open: boolean }> {
  await requireUserId();
  setRegistrationOpen(open);
  revalidatePath("/settings");
  return { success: true, open };
}

export async function updateSecurityPreferences(formData: FormData) {
    const autoLockMinutes = Number(formData.get("autoLockMinutes"));
    const privacyMode = formData.get("privacyMode") === "on";

    const userId = await requireUserId();

    await prisma.settings.upsert({
        where: { userId },
        update: {
            autoLockMinutes: autoLockMinutes,
            privacyMode: privacyMode
        },
        create: {
            userId,
            autoLockMinutes: autoLockMinutes,
            privacyMode: privacyMode,
            theme: "system",
            accentColor: "blue"
        }
    });

    // 2. Força a atualização do cache
    revalidatePath("/settings");
    revalidatePath("/", "layout");

    return { success: true };
}

export async function verifyMasterPassword(password: string) {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false };

    const isValid = await verifyPassword(password, user.password);

    return { success: isValid };
}
