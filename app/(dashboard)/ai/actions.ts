"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";

// Tipo de retorno para o frontend (Client Component)
interface MessageResponse {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface SendMessageResult {
  success: boolean;
  message?: MessageResponse;
  chatId?: string;
  error?: string;
}

export async function sendMessage(chatId: string | undefined, userMessage: string): Promise<SendMessageResult> {
  let currentChatId = chatId;

  // 1. Garante que o título do chat é limpo
  const cleanTitle = userMessage.trim().substring(0, 30) + (userMessage.trim().length > 30 ? "..." : "");

  // 2. Se não tem chat ID, cria um novo
  if (!currentChatId) {
    try {
      const newChat = await prisma.aiChat.create({
        data: { title: cleanTitle || "Nova Conversa" }
      });
      currentChatId = newChat.id;
    } catch (e) {
      console.error("Failed to create chat:", e);
      return { success: false, error: "Falha ao criar o chat." };
    }
  }

  // 3. Salva a mensagem do usuário no banco
  const userMsg = await prisma.aiMessage.create({
    data: { chatId: currentChatId, role: "user", content: userMessage }
  });

  // 4. Busca o contexto do sistema (Dados do Life OS)
  const systemContext = await getUserContext();

  // 5. Chama o Ollama Local
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", 
        // Usando o contexto como parte do prompt para o Llama 3
        prompt: `${systemContext}\n\n[INÍCIO DA CONVERSA]\nUsuário: ${userMessage}\nAssistente:`,
        stream: false,
        // Adicionando tag JSON para garantir formato ideal (opcional, mas bom)
        options: {
             temperature: 0.7,
             num_ctx: 4096 // Se tiver muito contexto
        }
      })
    });

    if (!response.ok) {
        throw new Error(`Ollama retornou status ${response.status}`);
    }
    
    // A API generate retorna JSON de uma vez (não stream)
    const data = await response.json();
    const aiResponse = data.response?.trim() || "Desculpe, não consegui gerar uma resposta.";

    // 6. Salva a resposta da IA no banco
    const aiMsg = await prisma.aiMessage.create({
      data: { chatId: currentChatId, role: "assistant", content: aiResponse }
    });

    // 7. Revalida e Retorna
    revalidatePath("/ai");
    return { 
      success: true, 
      chatId: currentChatId,
      message: {
        id: aiMsg.id,
        chatId: aiMsg.chatId,
        role: aiMsg.role,
        content: aiMsg.content,
        createdAt: aiMsg.createdAt,
      }
    };

  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("Erro ao falar com Ollama:", error);
    
    // Salva uma mensagem de erro no histórico
    await prisma.aiMessage.create({
        data: { 
            chatId: currentChatId, 
            role: "assistant", 
            content: `[ERRO DE CONEXÃO] Falha ao conectar ao Ollama local. Detalhes: ${errMessage}.`
        }
    });

    revalidatePath("/ai");
    return { success: false, error: `Ollama parece estar offline. Detalhe: ${errMessage}` };
  }
}

export async function clearChat(chatId: string) {
    if (!chatId) return;
    await prisma.aiChat.delete({ where: { id: chatId } });
    revalidatePath("/ai");
}