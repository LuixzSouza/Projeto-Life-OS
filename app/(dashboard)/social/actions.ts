"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { CONTACT_ACTION, CONTACT_MODULE } from "@/lib/social-contact";

// --- HELPERS DE FORMATAÇÃO ---

// Limpa a string e converte vazios em null para manter o banco limpo
function getValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value.trim();
}

// Tratamento seguro de datas para evitar o "Bug do Dia Anterior"
function parseDateSafe(rawDate: string | null): Date | null {
  if (!rawDate) return null;
  // Adicionar T12:00:00Z força a data a cair no meio-dia em UTC.
  // Isso impede que fusos horários locais (-03:00) empurrem o aniversário para o dia anterior.
  return new Date(`${rawDate}T12:00:00Z`);
}

// Extrai e formata todos os campos. (Evita repetir código no Create e Update)
function extractFriendData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    nickname: getValue(formData, "nickname"),
    tags: getValue(formData, "tags"),
    proximity: (formData.get("proximity") as string) || "CASUAL",
    email: getValue(formData, "email"),
    phone: getValue(formData, "phone"),
    imageUrl: getValue(formData, "imageUrl"),
    giftIdeas: getValue(formData, "giftIdeas"),
    birthday: parseDateSafe(getValue(formData, "birthday")),
    instagram: getValue(formData, "instagram"),
    linkedin: getValue(formData, "linkedin"),
    twitter: getValue(formData, "twitter"),
    jobTitle: getValue(formData, "jobTitle"),
    company: getValue(formData, "company"),
    pixKey: getValue(formData, "pixKey"),
    address: getValue(formData, "address"),
    notes: getValue(formData, "notes"),
  };
}

// Helper para pegar o ID do usuário autenticado (sessão JWT)
async function getAuthenticatedUserId() {
  return await getCurrentUserId();
}


// --- 1. CREATE (CRIAR) ---

export async function createFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };

    const data = extractFriendData(formData);
    if (!data.name) return { success: false, message: "O nome é obrigatório." };

    const created = await prisma.friend.create({
      data: {
        userId,
        ...data
      }
    });

    await logActivity({
      action: "CREATE",
      module: "social",
      entityType: "friend",
      entityId: created.id,
      summary: `Adicionou a conexão "${created.name}"`,
    });

    revalidatePath("/social");
    return { success: true, message: "Conexão salva com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar:", error);
    return { success: false, message: "Erro ao salvar contato." };
  }
}


// --- 2. UPDATE (ATUALIZAR) ---

export async function updateFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };

    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID do contato inválido." };

    const data = extractFriendData(formData);
    if (!data.name) return { success: false, message: "O nome é obrigatório." };

    // Usamos updateMany em vez de update para poder checar id e userId juntos
    // sem dar erro de chave composta no Prisma.
    const result = await prisma.friend.updateMany({
      where: { 
        id: id,
        userId: userId 
      },
      data: data
    });

    if (result.count === 0) {
      return { success: false, message: "Contato não encontrado ou permissão negada." };
    }

    revalidatePath("/social");
    return { success: true, message: "Perfil atualizado!" };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar dados do contato." };
  }
}


// --- MANTER CONTATO (sem schema: o registro vive no ActivityLog) ---

/**
 * Registra "falei com fulano hoje" — 1 clique no card. Vira um ActivityLog
 * (action CONTACT), então aparece também na Linha do Tempo.
 */
export async function registerContact(friendId: string): Promise<{ success: boolean; message: string; when: string | null }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente.", when: null };

    const friend = await prisma.friend.findFirst({
      where: { id: friendId, userId, deletedAt: null },
      select: { name: true },
    });
    if (!friend) return { success: false, message: "Contato não encontrado.", when: null };

    const now = new Date();
    await logActivity({
      action: CONTACT_ACTION,
      module: CONTACT_MODULE,
      entityType: "friend",
      entityId: friendId,
      summary: `Conversou com "${friend.name}"`,
    });

    revalidatePath("/social");
    return { success: true, message: `Contato com ${friend.name} registrado. 👋`, when: now.toISOString() };
  } catch (error) {
    console.error("Erro ao registrar contato:", error);
    return { success: false, message: "Falha ao registrar o contato.", when: null };
  }
}

/**
 * Último contato registrado por amigo (friendId → ISO). Derivado do ActivityLog,
 * reduzido em JS (sem _max de DateTime — quebra no libSQL/réplica).
 */
export async function getLastContacts(): Promise<Record<string, string>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return {};
    const logs = await prisma.activityLog.findMany({
      where: { userId, module: CONTACT_MODULE, action: CONTACT_ACTION, entityId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { entityId: true, createdAt: true },
    });
    const map: Record<string, string> = {};
    for (const log of logs) {
      if (log.entityId && !map[log.entityId]) map[log.entityId] = log.createdAt.toISOString();
    }
    return map;
  } catch (error) {
    console.error("Erro ao buscar últimos contatos:", error);
    return {};
  }
}

// --- 3. DELETE (DELETAR) ---

export async function deleteFriend(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };
    if (!id) return { success: false, message: "ID inválido." };

    // Soft-delete: vai para a Lixeira (deletedAt). Restaurar/excluir: ver /trash.
    const friend = await prisma.friend.findFirst({ where: { id, userId }, select: { name: true } });
    const result = await prisma.friend.updateMany({
      where: {
        id: id,
        userId: userId
      },
      data: { deletedAt: new Date() }
    });

    if (result.count === 0) {
        return { success: false, message: "Contato não encontrado ou permissão negada." };
    }

    await logActivity({
      action: "DELETE",
      module: "social",
      entityType: "friend",
      entityId: id,
      summary: friend ? `Moveu "${friend.name}" para a lixeira` : "Removeu uma conexão",
    });

    revalidatePath("/social");
    return { success: true, message: "Conexão movida para a lixeira." };

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { success: false, message: "Erro crítico ao excluir contato." };
  }
}