"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RoutineItem } from "@prisma/client";

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const location = formData.get("location") as string; // Novo
  const color = formData.get("color") as string;       // Novo
  const notification = formData.get("notification") === "on"; // Novo

  if (!title || !dateStr || !timeStr) {
    throw new Error("Preencha os campos obrigatórios.");
  }

  // Combina data e hora
  const startTime = new Date(`${dateStr}T${timeStr}:00`);

  await prisma.event.create({
    data: {
      title,
      description: description || null,
      startTime,
      location: location || null,
      color: color || "#6366f1", // Default indigo
      emailAlert: notification,
    },
  });

  revalidatePath("/agenda");
}

export async function deleteEvent(eventId: string) {
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/agenda");
}

// ATUALIZAR EVENTO
export async function updateEvent(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const location = formData.get("location") as string;
  const color = formData.get("color") as string;

  if (!id || !title || !dateStr || !timeStr) {
     throw new Error("Dados inválidos.");
  }

  const startTime = new Date(`${dateStr}T${timeStr}:00`);

  await prisma.event.update({
    where: { id },
    data: {
      title,
      description: description || null,
      startTime,
      location: location || null,
      color: color || "#6366f1",
    },
  });

  revalidatePath("/agenda");
}

export async function toggleTaskDone(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { isDone: true },
  });

  if (!task) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { isDone: !task.isDone },
  });

  revalidatePath("/agenda");
}

// Buscar itens de rotina
export async function getRoutineItems() {
  return await prisma.routineItem.findMany({
    orderBy: { startTime: 'asc' }
  });
}

// SETUP AUTOMÁTICO DA SUA ROTINA (Execute uma vez)
export async function seedRoutine() {
  const count = await prisma.routineItem.count();
  if (count > 0) return { success: false, message: "Rotina já existe!" };

  const routineData = [
    // --- SEGUNDA A QUINTA ---
    { time: "06:30", end: "07:00", title: "Acordar & Hidratação", cat: "health", days: "mon,tue,wed,thu", desc: "1 copo de água + conversa com namorada." },
    { time: "07:00", end: "08:00", title: "Treino Matinal", cat: "health", days: "mon,tue,wed,thu", desc: "Academia, corrida ou musculação." },
    { time: "08:15", end: "08:45", title: "Café da Manhã", cat: "health", days: "mon,tue,wed,thu", desc: "Frutas, ovos, pão integral." },
    { time: "09:00", end: "11:30", title: "Estudo Front-end (Foco)", cat: "study", days: "mon,tue,wed,thu", desc: "Pomodoro 25/5. Projetos práticos." },
    { time: "12:00", end: "12:30", title: "Almoço", cat: "health", days: "mon,tue,wed,thu", desc: "Refeição equilibrada." },
    { time: "12:30", end: "14:00", title: "Estudo + Duolingo", cat: "study", days: "mon,tue,wed,thu", desc: "Revisão de código e inglês." },
    { time: "17:30", end: "22:00", title: "Faculdade (S.I.)", cat: "work", days: "mon,tue,wed,thu", desc: "Aulas presenciais. Foco total." },
    { time: "23:40", end: "00:00", title: "Leitura & Meditação", cat: "health", days: "mon,tue,wed,thu", desc: "Bíblia e respiração." },

    // --- SEXTA ---
    { time: "09:00", end: "12:00", title: "Faxina Geral", cat: "home", days: "fri", desc: "Zerar a bagunça da semana." },
    { time: "12:30", end: "15:00", title: "Estudos / Portfólio", cat: "study", days: "fri", desc: "Foco na criação do portfólio." },
    { time: "15:15", end: "17:00", title: "Inglês & Revisão", cat: "study", days: "fri", desc: "Duolingo e revisão da semana." },
    { time: "21:00", end: "21:30", title: "Planejamento Semanal", cat: "work", days: "fri", desc: "Organizar agenda da próxima semana." },

    // --- SÁBADO ---
    { time: "09:00", end: "12:00", title: "Tarefas Leves", cat: "home", days: "sat", desc: "Organizar mochila, plantas, caminhada." },
    { time: "14:00", end: "17:00", title: "Visita Namorada", cat: "leisure", days: "sat", desc: "Tempo de qualidade." },
    
    // --- DOMINGO ---
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
        description: item.desc
    }))
  });

  revalidatePath("/agenda");
  return { success: true, message: "Rotina importada com sucesso!" };
}

// --- CRUD DE ROTINA ---

export async function createRoutineItem(formData: FormData) {
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const daysOfWeek = formData.get("daysOfWeek") as string; // Ex: "mon,tue"

  await prisma.routineItem.create({
    data: { title, startTime, endTime, description, category, daysOfWeek }
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

  await prisma.routineItem.update({
    where: { id },
    data: { title, startTime, endTime, description, category, daysOfWeek }
  });
  revalidatePath("/agenda");
}

export async function deleteRoutineItem(id: string) {
  await prisma.routineItem.delete({ where: { id } });
  revalidatePath("/agenda");
}

export async function resetRoutine() {
  await prisma.routineItem.deleteMany();
  revalidatePath("/agenda");
}