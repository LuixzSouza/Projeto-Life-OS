"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Atualizar Perfil (Simulado, pois só temos 1 user local)
export async function updateProfile(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // Atualiza o primeiro usuário que encontrar (Single User Mode)
  const user = await prisma.user.findFirst();
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, email }
    });
  }

  revalidatePath("/settings");
}

// ⚠️ PERIGO: Limpar todos os dados (Factory Reset)
export async function factoryReset() {
  // Apaga na ordem correta para não quebrar relacionamentos
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.studySubject.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.healthMetric.deleteMany();
  await prisma.event.deleteMany();
  
  revalidatePath("/");
}