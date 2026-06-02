"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, hashPassword, verifyPassword } from "@/lib/auth";
import { validatePasswordStrength } from "@/lib/password-policy";

// ============================================================================
// SEGURANÇA E FACTORY RESET
// ============================================================================
export async function changePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string;
  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message!);
  }
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(newPassword) }
  });
  revalidatePath("/");
}

export async function factoryReset() {
  try {
    // Apaga SOMENTE os dados do usuário logado.
    const userId = await requireUserId();
    const scope = { where: { userId } };

    // Ordem de deleção: filhos (FKs) -> pais
    await prisma.aiMessage.deleteMany(scope);
    await prisma.sitePage.deleteMany(scope);
    await prisma.invoice.deleteMany(scope);
    await prisma.flashcard.deleteMany(scope);
    await prisma.studyNote.deleteMany(scope);
    await prisma.studyContent.deleteMany(scope);
    await prisma.learningTask.deleteMany(scope);
    await prisma.learningGoal.deleteMany(scope);
    await prisma.studySession.deleteMany(scope);
    await prisma.transaction.deleteMany(scope);
    await prisma.task.deleteMany(scope);
    await prisma.event.deleteMany(scope);
    await prisma.billing.deleteMany(scope);

    await prisma.aiChat.deleteMany(scope);
    await prisma.managedSite.deleteMany(scope);
    await prisma.flashcardDeck.deleteMany(scope);
    await prisma.studySubject.deleteMany(scope);
    await prisma.account.deleteMany(scope);
    await prisma.project.deleteMany(scope);
    await prisma.client.deleteMany(scope);

    await prisma.jobApplication.deleteMany(scope);
    await prisma.workout.deleteMany(scope);
    await prisma.healthMetric.deleteMany(scope);
    await prisma.bodyMeasurement.deleteMany(scope);
    await prisma.meal.deleteMany(scope);
    await prisma.mealPlan.deleteMany(scope);
    await prisma.recurringExpense.deleteMany(scope);
    await prisma.wishlistItem.deleteMany(scope);
    await prisma.routineItem.deleteMany(scope);
    await prisma.accessItem.deleteMany(scope);
    await prisma.savedLink.deleteMany(scope);
    await prisma.mediaItem.deleteMany(scope);
    await prisma.friend.deleteMany(scope);
    await prisma.wardrobeItem.deleteMany(scope);
    await prisma.backupLog.deleteMany(scope);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro no Factory Reset:", error);
    throw new Error("Falha ao apagar dados.");
  }
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
