"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";

export async function sendMessage(chatId: string | undefined, userMessage: string) {
  let currentChatId = chatId;

  // 1. Se não tem chat ID, cria um novo
  if (!currentChatId) {
    const newChat = await prisma.aiChat.create({
      data: { title: userMessage.substring(0, 30) + "..." }
    });
    currentChatId = newChat.id;
  }

  // 2. Salva a mensagem do usuário no banco
  await prisma.aiMessage.create({
    data: { chatId: currentChatId, role: "user", content: userMessage }
  });

  // 3. Busca o contexto do sistema (Dados do Life OS)
  const systemContext = await getUserContext();

  // 4. Chama o Ollama Local
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", // Ou "mistral", dependendo do que você baixou
        prompt: `${systemContext}\n\nUsuário: ${userMessage}\nAssistente:`,
        stream: false
      })
    });

    const data = await response.json();
    const aiResponse = data.response;

    // 5. Salva a resposta da IA no banco
    await prisma.aiMessage.create({
      data: { chatId: currentChatId, role: "assistant", content: aiResponse }
    });

    revalidatePath("/ai");
    return { chatId: currentChatId }; // Retorna o ID para o frontend continuar no mesmo chat

  } catch (error) {
    console.error("Erro ao falar com Ollama:", error);
    return { error: "Ollama parece estar desligado. Verifique se o app está rodando." };
  }
}

export async function clearChat(chatId: string) {
    await prisma.aiChat.delete({ where: { id: chatId } });
    revalidatePath("/ai");
}