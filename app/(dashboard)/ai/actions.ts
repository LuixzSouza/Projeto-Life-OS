"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/ai-context";
import { revalidatePath } from "next/cache";


/* ============================================================================
   1. TIPAGENS ESTRITAS (FIM DO ANY)
   ============================================================================ */

export interface AIKeys {
  openai?: string | null;
  groq?: string | null;
  google?: string | null;
  deepseek?: string | null;
  mistral?: string | null;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface ToolArgs {
  action?: string;
  title?: string;
  id?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  amount?: number;
  description?: string;
  category?: string;
  type?: "WORKOUT" | "MEAL";
  duration?: number;
  calories?: number;
  username?: string;
  password?: string;
}

// Interfaces para OpenAI/Groq/Mistral/DeepSeek
interface OpenAIToolCall {
    id: string;
    type: string;
    function: { name: string; arguments: string };
}

interface OpenAIMessage {
    role: string;
    content?: string | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
}

// Interfaces para Google Gemini
interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

/* ============================================================================
   2. DEFINIÇÃO DE FERRAMENTAS (O ARSENAL DA IA)
   ============================================================================ */
const tools = [
  {
    type: "function",
    function: {
      name: "manage_tasks",
      description: "Cria, conclui ou deleta tarefas no sistema.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["CREATE", "COMPLETE", "DELETE"] },
          title: { type: "string", description: "Título da tarefa (para CREATE)" },
          id: { type: "string", description: "ID da tarefa (para COMPLETE ou DELETE)" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], description: "Prioridade" }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_finances",
      description: "Registra entradas ou saídas financeiras e consulta saldo.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["ADD_INCOME", "ADD_EXPENSE", "GET_BALANCE"] },
          amount: { type: "number", description: "Valor da transação" },
          description: { type: "string", description: "Descrição (ex: Compra de Livro)" },
          category: { type: "string", description: "Categoria (ex: Alimentação, Salário)" }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_vault",
      description: "Salva novas credenciais e senhas no cofre de acessos.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome do serviço (ex: Netflix)" },
          username: { type: "string", description: "Login ou Email" },
          password: { type: "string", description: "Senha gerada ou fornecida" },
          category: { type: "string", enum: ["WORK", "FINANCE", "SOCIAL", "OTHERS"] }
        },
        required: ["title", "password", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_health",
      description: "Registra treinos ou refeições no sistema de saúde.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["WORKOUT", "MEAL"] },
          title: { type: "string", description: "Ex: Treino de Costas ou Almoço" },
          duration: { type: "number", description: "Duração em minutos (Treino)" },
          calories: { type: "number", description: "Calorias (Refeição)" }
        },
        required: ["type", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_metrics",
      description: "Retorna um panorama geral de tudo que existe no banco de dados.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_health_data",
      description: "Busca os últimos treinos, peso atual e medidas corporais do usuário para análise de progresso.",
      parameters: { type: "object", "properties": {} }
    }
  },
];

/* ============================================================================
   3. EXECUTOR AUTÔNOMO (PONTE COM O PRISMA)
   ============================================================================ */
async function executeTool(name: string, args: ToolArgs): Promise<string> {
  console.log(`[CÉREBRO DIGITAL]: Executando -> ${name}`, args);

  try {
    switch (name) {
      case "manage_tasks":
        if (args.action === "CREATE" && args.title) {
          const task = await prisma.task.create({
            data: { title: args.title, priority: args.priority || "LOW" }
          });
          revalidatePath("/agenda");
          return `Tarefa "${task.title}" criada. ID: ${task.id}`;
        }
        if (args.action === "COMPLETE" && args.id) {
          await prisma.task.update({ where: { id: args.id }, data: { isDone: true, status: "DONE" } });
          revalidatePath("/agenda");
          return `Tarefa ${args.id} marcada como concluída.`;
        }
        return "Ação de tarefa inválida ou parâmetros faltando.";

      case "manage_finances":
        if (args.action === "GET_BALANCE") {
          const accounts = await prisma.account.findMany();
          const total = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
          return `Saldo consolidado: R$ ${total.toFixed(2)}`;
        }
        
        const account = await prisma.account.findFirst();
        if (!account) return "Erro: Nenhuma conta bancária cadastrada no sistema.";

        if ((args.action === "ADD_INCOME" || args.action === "ADD_EXPENSE") && args.amount && args.description) {
          const type = args.action === "ADD_INCOME" ? "INCOME" : "EXPENSE";
          await prisma.transaction.create({
            data: {
              description: args.description,
              amount: args.amount,
              type: type,
              category: args.category || "Geral",
              accountId: account.id
            }
          });
          
          const newBalance = type === "INCOME" ? Number(account.balance) + args.amount : Number(account.balance) - args.amount;
          await prisma.account.update({ where: { id: account.id }, data: { balance: newBalance } });
          
          revalidatePath("/finance");
          return `Transação de R$ ${args.amount} (${type}) registrada com sucesso na conta ${account.name}.`;
        }
        return "Parâmetros financeiros inválidos.";

      case "manage_vault":
        if (args.title && args.password && args.category) {
          const access = await prisma.accessItem.create({
            data: {
              title: args.title,
              username: args.username || "",
              password: args.password,
              category: args.category
            }
          });
          revalidatePath("/access");
          return `Credencial para "${access.title}" salva no cofre com segurança extrema.`;
        }
        return "Faltam dados para salvar no cofre (precisa de title, password e category).";

      case "log_health":
        if (args.type === "WORKOUT" && args.title) {
          await prisma.workout.create({
            data: { title: args.title, type: "Generico", duration: args.duration || 30, intensity: "MEDIUM" }
          });
          revalidatePath("/health");
          return `Treino "${args.title}" de ${args.duration || 30} mins registrado.`;
        }
        if (args.type === "MEAL" && args.title) {
          await prisma.meal.create({
            data: { title: args.title, items: args.title, type: "SNACK", calories: args.calories || 0 }
          });
          revalidatePath("/health");
          return `Refeição "${args.title}" registrada.`;
        }
        return "Parâmetros de saúde inválidos.";

      case "get_system_metrics":
        const [taskCount, projectCount, clientCount, vaultCount] = await Promise.all([
            prisma.task.count({ where: { isDone: false } }),
            prisma.project.count({ where: { status: "ACTIVE" } }),
            prisma.client.count({ where: { status: "ACTIVE" } }),
            prisma.accessItem.count()
        ]);
        return `Métricas Atuais: ${taskCount} pendentes, ${projectCount} projetos, ${clientCount} clientes, ${vaultCount} senhas no cofre.`;

      case "get_health_data":
        // Busca os 3 últimos treinos
        const lastWorkouts = await prisma.workout.findMany({
            orderBy: { date: 'desc' },
            take: 3
        });
        
        // Busca a última medição de corpo/peso
        const lastMeasurement = await prisma.bodyMeasurement.findFirst({
            orderBy: { date: 'desc' }
        });

        if (!lastWorkouts.length && !lastMeasurement) {
            return "O usuário ainda não registrou nenhum treino ou peso no sistema.";
        }

        return JSON.stringify({
            mensagem_interna: "Use esses dados reais para responder ao usuário.",
            ultimoPeso: lastMeasurement ? `${lastMeasurement.weight} kg em ${lastMeasurement.date.toLocaleDateString('pt-BR')}` : "Sem registro de peso",
            ultimosTreinos: lastWorkouts.map(w => `${w.title} (${w.type}) - Duração: ${w.duration} min - Intensidade: ${w.intensity} - Data: ${w.date.toLocaleDateString('pt-BR')}`)
        });

      default:
        return "Protocolo de ferramenta desconhecido.";
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Falha ao conectar no Prisma.";
    return `Erro crítico ao acessar o banco: ${errorMessage}`;
  }
}

/* ============================================================================
   4. TRADUTORES DE API (O NÚCLEO DE ROTEAMENTO)
   ============================================================================ */

// ---> 4.1 TRADUTOR GOOGLE GEMINI
async function handleGeminiProvider(modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;
    
    // Converte as ferramentas padrão para o formato Gemini
    const geminiTools = [{
        functionDeclarations: tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
        }))
    }];

    const contents: GeminiContent[] = history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        tools: geminiTools
    };

    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro na API do Gemini");

    const part = data.candidates?.[0]?.content?.parts?.[0];
    if (!part) return "Sem resposta válida do Gemini.";

    // Se o Gemini decidiu chamar uma ferramenta
    if (part.functionCall) {
        const args = part.functionCall.args as ToolArgs;
        const result = await executeTool(part.functionCall.name, args);
        
        // Adiciona a requisição da função e o resultado ao histórico
        contents.push({ role: "model", parts: [part] });
        contents.push({ role: "user", parts: [{ functionResponse: { name: part.functionCall.name, response: { result } } }] });

        const secondResponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: payload.systemInstruction, contents, tools: geminiTools }) });
        const secondData = await secondResponse.json();
        return secondData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na segunda iteração do Gemini.";
    }

    return part.text || "";
}

// ---> 4.2 TRADUTOR PADRÃO (OPENAI, GROQ, DEEPSEEK, MISTRAL, OLLAMA)
async function handleOpenAILikeProvider(url: string, finalModel: string, apiKey: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[]): Promise<string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`; // Ollama não usa apiKey

    const messages: OpenAIMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userMessage }
    ];

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: finalModel, messages, tools, tool_choice: "auto" })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro na comunicação com a API.");

    const aiMsg = data.choices?.[0]?.message as OpenAIMessage;
    if (!aiMsg) return "Sem resposta da rede neural.";

    // Se a IA NÃO chamou ferramenta, retorna o texto
    if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) return aiMsg.content || "";

    // SE A IA CHAMOU FERRAMENTAS:
    messages.push(aiMsg);

    for (const call of aiMsg.tool_calls) {
        const args = JSON.parse(call.function.arguments) as ToolArgs;
        const result = await executeTool(call.function.name, args);
        
        messages.push({ 
            role: "tool", 
            tool_call_id: call.id, 
            name: call.function.name, 
            content: result 
        });
    }

    // Segunda chamada para gerar a resposta final com base no banco de dados
    const finalResponse = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: finalModel, messages })
    });

    const finalData = await finalResponse.json();
    if (!finalResponse.ok) throw new Error(finalData.error?.message || "Erro na geração final.");
    
    return finalData.choices?.[0]?.message?.content || "";
}


/* ============================================================================
   5. IA CALLER (LOOP DE PENSAMENTO CENTRAL)
   ============================================================================ */
async function callAIProvider(provider: string, modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], keys: AIKeys): Promise<string> {
  
  // 1. Rota Google Gemini
  if (provider === 'google') {
      const apiKey = keys.google || process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("Credencial ausente. Cadastre sua API Key do Google Gemini.");
      return await handleGeminiProvider(modelConfig, systemPrompt, userMessage, history, apiKey);
  }

  // 2. Rota Padrão (APIs compatíveis e Ollama Local)
  let apiKey = "";
  let url = "";
  let finalModel = modelConfig;

  switch (provider) {
      case 'openai':
          apiKey = keys.openai || process.env.OPENAI_API_KEY || "";
          url = "https://api.openai.com/v1/chat/completions";
          finalModel = modelConfig || "gpt-3.5-turbo";
          break;
      case 'groq':
          apiKey = keys.groq || process.env.GROQ_API_KEY || "";
          url = "https://api.groq.com/openai/v1/chat/completions";
          finalModel = "llama-3.3-70b-versatile"; 
          break;
      case 'deepseek':
          apiKey = keys.deepseek || process.env.DEEPSEEK_API_KEY || "";
          url = "https://api.deepseek.com/chat/completions";
          finalModel = modelConfig || "deepseek-reasoner";
          break;
      case 'mistral':
          apiKey = keys.mistral || process.env.MISTRAL_API_KEY || "";
          url = "https://api.mistral.ai/v1/chat/completions";
          finalModel = modelConfig || "mistral-large-latest";
          break;
      case 'ollama':
          url = "http://localhost:11434/api/chat";
          finalModel = modelConfig || "llama3.1"; // Recomenda-se Llama 3.1+ para usar Tools no Ollama
          break;
      default:
          throw new Error("Provedor não suportado para chamadas autônomas.");
  }

  if (!apiKey && provider !== 'ollama') {
      throw new Error(`Credencial ausente. Cadastre sua API Key para ${provider.toUpperCase()} nas configurações.`);
  }

  return await handleOpenAILikeProvider(url, finalModel, apiKey, systemPrompt, userMessage, history);
}

/* ============================================================================
   6. SEND MESSAGE (ROTEAMENTO PRINCIPAL DO CHAT)
   ============================================================================ */
export async function sendMessage(chatId: string | undefined, userMessage: string) {
  let currentChatId = chatId;

  if (!currentChatId) {
    const newChat = await prisma.aiChat.create({ data: { title: userMessage.substring(0, 30) + "..." } });
    currentChatId = newChat.id;
  }

  await prisma.aiMessage.create({ data: { chatId: currentChatId, role: "user", content: userMessage } });

  try {
    const [systemContext, settings, chatHistory] = await Promise.all([
        getUserContext(), 
        prisma.settings.findFirst(),
        prisma.aiMessage.findMany({ where: { chatId: currentChatId }, orderBy: { createdAt: 'desc' }, take: 10, skip: 1 })
    ]);

    const history: ChatHistoryItem[] = chatHistory.reverse().map(msg => ({ role: msg.role, content: msg.content }));
    const provider = settings?.aiProvider || "openai";
    
    // CAST SEGURO
    const s = settings as unknown as Record<string, string | null | undefined>;
    const keys: AIKeys = { 
        openai: s?.openaiKey, 
        groq: s?.groqKey,
        google: s?.googleKey,
        deepseek: s?.deepseekKey,
        mistral: s?.mistralKey
    };

    const customPersona: string = settings?.aiPersona && settings.aiPersona.trim() !== "" 
        ? settings.aiPersona 
        : "Você é o núcleo de inteligência (Cérebro Digital) do sistema Life OS. Responda de forma cirúrgica e prestativa.";

    // PROMPT MESTRE ESTRUTURADO EM BLOCOS
    const fullSystemPrompt: string = `
[IDENTIDADE E PERSONALIDADE]
${customPersona}

[CONTEXTO DE TEMPO E ESPAÇO]
Data e Hora Atual: ${new Date().toLocaleString('pt-BR')}

[LEITURA DE SENSORES DO LIFE OS]
${systemContext}

[DIRETRIZES ESTRITAS DE SISTEMA - NÃO IGNORE]
1. EXECUÇÃO DE TAREFAS: Se o usuário pedir para anotar, criar, agendar, registrar ou deletar algo, VOCÊ DEVE USAR AS FERRAMENTAS (Tools) disponíveis.
2. BUSCA DE DADOS: Se pedir resumos ou relatórios, use ferramentas como 'get_system_metrics' ou 'manage_finances' para buscar dados reais antes de responder.
3. CONFIANÇA: Nunca diga "Eu não tenho acesso ao sistema" ou "Não posso fazer isso". Você tem acesso total via Tools.
4. TOM DE VOZ: Após executar as ferramentas, responda o usuário mantendo estritamente a [IDENTIDADE E PERSONALIDADE] definida no topo deste prompt.
    `;

    const aiResponseContent = await callAIProvider(provider, settings?.aiModel || "", fullSystemPrompt, userMessage, history, keys);

    const aiMsg = await prisma.aiMessage.create({
      data: { chatId: currentChatId, role: "assistant", content: aiResponseContent, provider, model: settings?.aiModel }
    });

    revalidatePath("/ai");
    return { success: true, chatId: currentChatId, message: aiMsg };

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Falha nos sistemas centrais.";
    return { success: false, error: errMessage };
  }
}

export async function clearChat(chatId: string) {
    if (!chatId) return { success: false };
    
    try {
        await prisma.aiChat.delete({ where: { id: chatId } });
        return { success: true };
    } catch (error) {
        console.error("[CÉREBRO DIGITAL]: Erro ao purgar memória", error);
        return { success: false };
    }
}