"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";

// Tipos
export interface MessageResponse {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
  provider?: string | null; 
  model?: string | null;    
}

export interface SendMessageResult {
  success: boolean;
  message?: MessageResponse;
  chatId?: string;
  error?: string;
}

interface AIKeys {
    openai?: string | null;
    groq?: string | null;
    google?: string | null;
}

interface ChatHistoryItem {
  role: string;
  content: string;
}

function estimateTokens(text: string) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

// --- FUNÇÃO AUXILIAR DE CHAMADA DE API ---
async function callAIProvider(
  provider: string, 
  modelConfig: string, 
  systemPrompt: string, 
  userMessage: string, 
  history: ChatHistoryItem[],
  keys: AIKeys
) {
  
  // 1. OLLAMA (LOCAL)
  if (provider === 'ollama') {
    const modelName = modelConfig || "llama3"; 
    
    try {
        const response = await fetch("http://localhost:11434/api/chat", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }],
            stream: false,
            options: { temperature: 0.7, num_ctx: 4096 }
          })
        });

        if (!response.ok) throw new Error("Ollama não respondeu. Verifique se o app está aberto.");
        const data = await response.json();
        return data.message?.content || "Sem resposta do Ollama.";
    } catch (e) {
        throw new Error("Falha na conexão local. O Ollama está rodando?");
    }
  }

  // 2. OPENAI
  if (provider === 'openai') {
    const apiKey = keys.openai || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("⚠️ Chave da OpenAI não encontrada.");

    // Se o modelo for gpt-4 e der erro, é pq o usuário não tem acesso. O padrão deve ser 3.5
    let modelName = modelConfig;
    if (!modelName || modelName.includes("gpt-4")) {
        // Se o usuário não pagou, ele NÃO tem acesso ao GPT-4, então forçamos o 3.5 para tentar funcionar
        // Mas se ele estiver sem crédito total, nem o 3.5 vai.
        modelName = "gpt-3.5-turbo"; 
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const error = await response.json();
        if (error.error?.code === 'insufficient_quota') {
            throw new Error("🚫 Seus créditos da OpenAI acabaram. Mude para Groq ou Google nas Configurações.");
        }
        throw new Error(`OpenAI Error: ${error.error?.message}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content;
  }

  // 3. GROQ (CORREÇÃO AUTOMÁTICA DE MODELO)
  if (provider === 'groq') {
    const apiKey = keys.groq || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("⚠️ Chave da Groq não encontrada.");

    // ✅ AUTO-CORREÇÃO: Se o banco tem o nome antigo, usamos o novo
    let modelName = modelConfig;
    if (!modelName || modelName.includes("8192") || modelName === "llama3") {
        modelName = "llama-3.3-70b-versatile"; // Modelo atualizado Dez/2025
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.code === 'rate_limit_exceeded') {
             throw new Error("⏳ Limite da Groq atingido. Espere 1 minuto.");
        }
        // Se mesmo com a correção der erro, mostramos qual modelo foi tentado
        if (errorData.error?.type === 'invalid_request_error') {
             throw new Error(`❌ Modelo '${modelName}' inválido na Groq.`);
        }
        throw new Error(`Groq Error: ${errorData.error?.message}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content;
  }

  // 4. GOOGLE GEMINI (CORREÇÃO AUTOMÁTICA DE MODELO)
  if (provider === 'google') {
    const apiKey = keys.google || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("⚠️ Chave do Google não encontrada.");
    
    // ✅ AUTO-CORREÇÃO: Se o banco tem 'gemini-pro' (descontinuado), forçamos o flash
    let modelName = modelConfig;
    if (!modelName || modelName === "gemini-pro") {
        modelName = "gemini-1.5-flash"; 
    }

    const contents = [
        { role: "user", parts: [{ text: systemPrompt }] }, 
        { role: "model", parts: [{ text: "Entendido." }] },
        ...history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        })),
        { role: "user", parts: [{ text: userMessage }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Mensagem de erro amigável se o modelo falhar
        if (errorData.error?.status === 'NOT_FOUND') {
             throw new Error(`O modelo '${modelName}' não existe mais. Use 'gemini-1.5-flash' nas configurações.`);
        }
        throw new Error(`Gemini Error: ${errorData.error?.message}`);
    }
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        return "O Gemini bloqueou a resposta por segurança.";
    }
    
    return data.candidates[0]?.content?.parts[0]?.text;
  }

  throw new Error("Provedor de IA desconhecido.");
}


// --- MAIN ACTION ---
export async function sendMessage(chatId: string | undefined, userMessage: string): Promise<SendMessageResult> {
  let currentChatId = chatId;

  if (currentChatId) {
    const chatExists = await prisma.aiChat.findUnique({ where: { id: currentChatId } });
    if (!chatExists) currentChatId = undefined;
  }

  if (!currentChatId) {
    try {
      const cleanTitle = userMessage.trim().substring(0, 30) + (userMessage.trim().length > 30 ? "..." : "");
      const newChat = await prisma.aiChat.create({
        data: { title: cleanTitle || "Nova Conversa" }
      });
      currentChatId = newChat.id;
    } catch (e) {
      console.error("Failed to create chat:", e);
      return { success: false, error: "Falha ao criar o chat." };
    }
  }

  await prisma.aiMessage.create({
    data: { chatId: currentChatId, role: "user", content: userMessage }
  });

  try {
    const [systemContext, settings, chatHistory] = await Promise.all([
        getUserContext(), 
        prisma.settings.findFirst(),
        prisma.aiMessage.findMany({ 
            where: { chatId: currentChatId },
            orderBy: { createdAt: 'desc' },
            take: 6,
            skip: 1 
        })
    ]);

    const history: ChatHistoryItem[] = chatHistory.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const provider = settings?.aiProvider || "ollama";
    const model = settings?.aiModel || ""; 
    const persona = settings?.aiPersona || "Você é um assistente pessoal inteligente.";

    const keys: AIKeys = {
        openai: settings?.openaiKey,
        groq: settings?.groqKey,
        google: settings?.googleKey
    };

    const fullSystemPrompt = `${persona}\n\n[CONTEXTO ATUAL DO USUÁRIO]:\n${systemContext}`;
    
    const inputTokens = estimateTokens(fullSystemPrompt + JSON.stringify(history) + userMessage);

    // CHAMADA DA IA
    const aiResponseContent = await callAIProvider(provider, model, fullSystemPrompt, userMessage, history, keys);

    const outputTokens = estimateTokens(aiResponseContent);
    const totalTokens = inputTokens + outputTokens;

    if (settings) {
        const currentUsage = settings.aiUsage ? JSON.parse(settings.aiUsage) : {};
        const providerUsage = currentUsage[provider] || 0;
        const lastReset = currentUsage.lastReset ? new Date(currentUsage.lastReset) : new Date();
        const now = new Date();
        
        if (now.getMonth() !== lastReset.getMonth()) {
            currentUsage[provider] = totalTokens;
            currentUsage.lastReset = now.toISOString();
        } else {
            currentUsage[provider] = providerUsage + totalTokens;
            if (!currentUsage.lastReset) currentUsage.lastReset = now.toISOString();
        }

        prisma.settings.update({
            where: { id: settings.id },
            data: { aiUsage: JSON.stringify(currentUsage) }
        }).catch(err => console.error("Erro ao salvar stats de uso:", err));
    }

    const aiMsg = await prisma.aiMessage.create({
      data: { 
          chatId: currentChatId, 
          role: "assistant", 
          content: aiResponseContent,
          provider: provider, 
          model: model        
      }
    });

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
        provider: aiMsg.provider, 
        model: aiMsg.model
      }
    };

  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    
    return { success: false, error: errMessage };
  }
}

export async function clearChat(chatId: string) {
    if (!chatId) return;
    await prisma.aiChat.delete({ where: { id: chatId } });
    revalidatePath("/ai");
}