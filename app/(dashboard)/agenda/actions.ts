"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

// --- EVENTOS (Agora com suporte a Timeblocking real) ---

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const endTimeStr = formData.get("endTime") as string; // 🟢 NOVO: Hora de fim
  const location = formData.get("location") as string; 
  const color = formData.get("color") as string;       
  const notification = formData.get("notification") === "on"; 

  if (!title || !dateStr || !timeStr) {
    throw new Error("Preencha os campos obrigatórios (Título, Data e Hora).");
  }

  // Combina data e hora de início
  const startTime = new Date(`${dateStr}T${timeStr}:00`);
  
  // 🟢 NOVO: Combina data e hora de fim (se não enviar, assume +1 hora)
  let endTime = new Date(startTime);
  if (endTimeStr) {
      endTime = new Date(`${dateStr}T${endTimeStr}:00`);
      if (endTime <= startTime) throw new Error("A hora final deve ser maior que a inicial.");
  } else {
      endTime.setHours(endTime.getHours() + 1);
  }

  const userId = await requireUserId();

  const created = await prisma.event.create({
    data: {
      title,
      description: description || null,
      startTime,
      endTime, // 🟢 NOVO (Atualize seu schema.prisma se necessário)
      location: location || null,
      color: color || "#3B82F6", // Default Blue (Google Calendar vibe)
      emailAlert: notification,
      userId,
    },
  });

  await logActivity({
    action: "CREATE",
    module: "agenda",
    entityType: "event",
    entityId: created.id,
    summary: `Criou o evento "${created.title}"`,
  });

  // Aviso pontual: evento marcado para as próximas 24h. Mesma chave (type/entity)
  // do generateReminders, então não duplica quando os lembretes são gerados depois.
  const msUntil = startTime.getTime() - Date.now();
  if (msUntil > 0 && msUntil <= 24 * 3600 * 1000) {
    await notify({
      type: "EVENT",
      title: `Em breve: ${created.title}`,
      body: created.location ?? undefined,
      entityType: "event",
      entityId: created.id,
      actionUrl: "/agenda",
      dueAt: startTime,
    });
  }

  revalidatePath("/agenda");
}

export async function updateEvent(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const endTimeStr = formData.get("endTime") as string; // 🟢 NOVO
  const location = formData.get("location") as string;
  const color = formData.get("color") as string;

  if (!id || !title || !dateStr || !timeStr) {
     throw new Error("Dados inválidos.");
  }

  const startTime = new Date(`${dateStr}T${timeStr}:00`);
  
  let endTime = new Date(startTime);
  if (endTimeStr) {
      endTime = new Date(`${dateStr}T${endTimeStr}:00`);
  } else {
      endTime.setHours(endTime.getHours() + 1);
  }

  const userId = await requireUserId();

  await prisma.event.updateMany({
    where: { id, userId },
    data: {
      title,
      description: description || null,
      startTime,
      endTime,
      location: location || null,
      color: color || "#3B82F6",
    },
  });

  revalidatePath("/agenda");
}

// Soft-delete: o evento vai para a Lixeira (deletedAt) e some das listagens.
// Restaurar/excluir em definitivo: ver app/(dashboard)/trash.
export async function deleteEvent(eventId: string) {
  const userId = await requireUserId();
  const event = await prisma.event.findFirst({ where: { id: eventId, userId }, select: { title: true } });
  await prisma.event.updateMany({ where: { id: eventId, userId }, data: { deletedAt: new Date() } });

  await logActivity({
    action: "DELETE",
    module: "agenda",
    entityType: "event",
    entityId: eventId,
    summary: event ? `Moveu "${event.title}" para a lixeira` : "Excluiu um evento",
  });

  revalidatePath("/agenda");
}

// --- TAREFAS ---

export async function toggleTaskDone(taskId: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { isDone: true },
  });

  if (!task) return;

  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { isDone: !task.isDone },
  });

  revalidatePath("/agenda");
}

// --- ROTINAS (Mantido intacto) ---

export async function getRoutineItems() {
  const userId = await getCurrentUserId();
  return await prisma.routineItem.findMany({
    where: { userId },
    orderBy: { startTime: 'asc' }
  });
}

export async function seedRoutine() {
  const userId = await requireUserId();
  const count = await prisma.routineItem.count({ where: { userId } });
  if (count > 0) return { success: false, message: "Rotina já existe!" };

  const routineData = [
    // ... [Seus dados de rotina mantidos exatamente iguais] ...
    { time: "06:30", end: "07:00", title: "Acordar & Hidratação", cat: "health", days: "mon,tue,wed,thu", desc: "1 copo de água + conversa com namorada." },
    { time: "07:00", end: "08:00", title: "Treino Matinal", cat: "health", days: "mon,tue,wed,thu", desc: "Academia, corrida ou musculação." },
    { time: "08:15", end: "08:45", title: "Café da Manhã", cat: "health", days: "mon,tue,wed,thu", desc: "Frutas, ovos, pão integral." },
    { time: "09:00", end: "11:30", title: "Estudo Front-end (Foco)", cat: "study", days: "mon,tue,wed,thu", desc: "Pomodoro 25/5. Projetos práticos." },
    { time: "12:00", end: "12:30", title: "Almoço", cat: "health", days: "mon,tue,wed,thu", desc: "Refeição equilibrada." },
    { time: "12:30", end: "14:00", title: "Estudo + Duolingo", cat: "study", days: "mon,tue,wed,thu", desc: "Revisão de código e inglês." },
    { time: "17:30", end: "22:00", title: "Faculdade (S.I.)", cat: "work", days: "mon,tue,wed,thu", desc: "Aulas presenciais. Foco total." },
    { time: "23:40", end: "00:00", title: "Leitura & Meditação", cat: "health", days: "mon,tue,wed,thu", desc: "Bíblia e respiração." },
    { time: "09:00", end: "12:00", title: "Faxina Geral", cat: "home", days: "fri", desc: "Zerar a bagunça da semana." },
    { time: "12:30", end: "15:00", title: "Estudos / Portfólio", cat: "study", days: "fri", desc: "Foco na criação do portfólio." },
    { time: "15:15", end: "17:00", title: "Inglês & Revisão", cat: "study", days: "fri", desc: "Duolingo e revisão da semana." },
    { time: "21:00", end: "21:30", title: "Planejamento Semanal", cat: "work", days: "fri", desc: "Organizar agenda da próxima semana." },
    { time: "09:00", end: "12:00", title: "Tarefas Leves", cat: "home", days: "sat", desc: "Organizar mochila, plantas, caminhada." },
    { time: "14:00", end: "17:00", title: "Visita Namorada", cat: "leisure", days: "sat", desc: "Tempo de qualidade." },
    { time: "09:00", end: "11:00", title: "Atividade Leve", cat: "health", days: "sun", desc: "Caminhada ou bicicleta." },
    { time: "13:00", end: "15:00", title: "Revisão & Planejamento", cat: "work", days: "sun", desc: "Ajustar planos e metas." },
  ];

  await prisma.routineItem.createMany({
    data: routineData.map(item => ({
        title: item.title,
        startTime: item.time,
        endTime: item.end,
        category: item.cat,
        daysOfWeek: item.days,
        description: item.desc,
        userId
    }))
  });

  revalidatePath("/agenda");
  return { success: true, message: "Rotina importada com sucesso!" };
}

export async function createRoutineItem(formData: FormData) {
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const daysOfWeek = formData.get("daysOfWeek") as string;

  const userId = await requireUserId();

  await prisma.routineItem.create({
    data: { title, startTime, endTime, description, category, daysOfWeek, userId }
  });
  revalidatePath("/agenda");
}

export async function updateRoutineItem(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const daysOfWeek = formData.get("daysOfWeek") as string;

  const userId = await requireUserId();

  await prisma.routineItem.updateMany({
    where: { id, userId },
    data: { title, startTime, endTime, description, category, daysOfWeek }
  });
  revalidatePath("/agenda");
}

export async function deleteRoutineItem(id: string) {
  const userId = await requireUserId();
  await prisma.routineItem.deleteMany({ where: { id, userId } });
  revalidatePath("/agenda");
}

export async function resetRoutine() {
  const userId = await requireUserId();
  await prisma.routineItem.deleteMany({ where: { userId } });
  revalidatePath("/agenda");
}