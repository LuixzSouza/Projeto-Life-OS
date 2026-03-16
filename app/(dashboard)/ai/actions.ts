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
  module?: "FINANCE" | "HEALTH" | "TASKS" | "PROJECTS" | "STUDIES" | "ENTERTAINMENT" | "CRM" | "FRIENDS" | "VAULT" | "WARDROBE";
  action?: "CREATE" | "UPDATE" | "DELETE" | "READ";
  id?: string;
  title?: string;
  description?: string;
  value?: number;
  category?: string;
  status?: string;
  limit?: number;
}

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

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

interface UpdatedHistoryItem {
    role: string;
    content?: string;
    tool_call_id?: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
}

/* ============================================================================
   2. MACRO-FERRAMENTAS (MODO DEUS)
   ============================================================================ */
const tools = [
  {
    type: "function",
    function: {
      name: "query_system_data",
      description: "LÊ dados do banco. USE ANTES de responder sobre finanças, saúde, tarefas, projetos, filmes, amigos, clientes, etc.",
      parameters: {
        type: "object",
        properties: {
          module: { 
              type: "string", 
              enum: ["FINANCE", "HEALTH", "TASKS", "PROJECTS", "STUDIES", "ENTERTAINMENT", "CRM", "FRIENDS", "VAULT", "WARDROBE"],
          },
          limit: { type: "number", description: "Quantidade de registros para buscar (ex: 5)." },
          category: { type: "string", description: "Filtro opcional." }
        },
        required: ["module"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mutate_system_data",
      description: "CRIA, ATUALIZA ou DELETA registros. Use quando o usuário pedir para anotar, salvar, faturar, concluir ou apagar algo.",
      parameters: {
        type: "object",
        properties: {
          module: { 
              type: "string", 
              enum: ["FINANCE", "HEALTH", "TASKS", "PROJECTS", "STUDIES", "ENTERTAINMENT", "CRM", "FRIENDS", "VAULT", "WARDROBE"]
          },
          action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE"] },
          id: { type: "string", description: "Obrigatório para UPDATE ou DELETE." },
          title: { type: "string", description: "Título, nome do amigo/cliente ou descrição da tarefa/despesa." },
          description: { type: "string", description: "Notas, detalhes ou senha." },
          value: { type: "number", description: "Valor numérico (R$, Kg, Calorias, Minutos)." },
          category: { type: "string", description: "Categoria, tipo, ou status." }
        },
        required: ["module", "action"]
      }
    }
  }
];

/* ============================================================================
   3. EXECUTOR AUTÔNOMO (PONTE PRISMA)
   ============================================================================ */
async function executeTool(name: string, args: ToolArgs): Promise<string> {
  console.log(`[CÉREBRO DIGITAL]: Operação Tática -> ${name}`, args);

  try {
    // ---------------------------------------------------------
    // LUPA DE BUSCA (READ)
    // ---------------------------------------------------------
    if (name === "query_system_data") {
        const take = args.limit || 5;

        switch (args.module) {
            case "FINANCE":
                const accounts = await prisma.account.findMany({ select: { name: true, balance: true } });
                const txs = await prisma.transaction.findMany({ orderBy: { date: 'desc' }, take });
                const wishlists = await prisma.wishlistItem.findMany({ take });
                return JSON.stringify({ saldo: accounts, transacoes: txs, lista_desejos: wishlists });
            
            case "HEALTH":
                const workouts = await prisma.workout.findMany({ orderBy: { date: 'desc' }, take });
                const body = await prisma.bodyMeasurement.findFirst({ orderBy: { date: 'desc' } });
                const meals = await prisma.meal.findMany({ orderBy: { date: 'desc' }, take: 3 });
                return JSON.stringify({ peso_atual: body, treinos: workouts, refeicoes: meals });
            
            case "TASKS":
                const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take });
                return JSON.stringify({ tarefas: tasks });
            
            case "PROJECTS":
                const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, take });
                return JSON.stringify({ projetos: projects });
            
            case "ENTERTAINMENT":
                const media = await prisma.mediaItem.findMany({ orderBy: { updatedAt: 'desc' }, take });
                return JSON.stringify({ entretenimento: media });
            
            case "CRM":
                const clients = await prisma.client.findMany({ take });
                const billings = await prisma.billing.findMany({ take });
                const jobs = await prisma.jobApplication.findMany({ take });
                return JSON.stringify({ clientes: clients, faturamentos: billings, vagas_emprego: jobs });

            case "FRIENDS":
                const friends = await prisma.friend.findMany({ take });
                return JSON.stringify({ contatos_pessoais: friends });

            case "WARDROBE":
                const clothes = await prisma.wardrobeItem.findMany({ take });
                return JSON.stringify({ guarda_roupa: clothes });

            case "VAULT":
                const vaults = await prisma.accessItem.findMany({ select: { id: true, title: true, category: true, username: true } });
                return JSON.stringify({ acessos: vaults });

            case "STUDIES":
                const sessions = await prisma.studySession.findMany({ orderBy: { date: 'desc' }, take });
                const notes = await prisma.studyNote.findMany({ take: 3 });
                return JSON.stringify({ sessoes_estudo: sessions, anotacoes: notes });

            default:
                return "Módulo de leitura não implementado.";
        }
    }

    // ---------------------------------------------------------
    // BRAÇO MECÂNICO (CREATE, UPDATE, DELETE)
    // ---------------------------------------------------------
    if (name === "mutate_system_data") {
        
        // --- DELETAR ---
        if (args.action === "DELETE" && args.id) {
            if (args.module === "TASKS") await prisma.task.delete({ where: { id: args.id } });
            else if (args.module === "FINANCE") await prisma.transaction.delete({ where: { id: args.id } });
            else if (args.module === "HEALTH") await prisma.workout.delete({ where: { id: args.id } });
            else if (args.module === "ENTERTAINMENT") await prisma.mediaItem.delete({ where: { id: args.id } });
            else if (args.module === "CRM") await prisma.client.delete({ where: { id: args.id } });
            else if (args.module === "FRIENDS") await prisma.friend.delete({ where: { id: args.id } });
            
            revalidatePath("/", "layout");
            return `Registro ${args.id} deletado com sucesso do módulo ${args.module}.`;
        }

        // --- CRIAR / ATUALIZAR ---
        switch (args.module) {
            case "TASKS":
                if (args.action === "CREATE" && args.title) {
                    const newTask = await prisma.task.create({ data: { title: args.title, description: args.description, priority: args.category || "LOW" } });
                    revalidatePath("/agenda");
                    return `Tarefa "${newTask.title}" criada.`;
                }
                if (args.action === "UPDATE" && args.id) {
                    const isDone = args.category === 'DONE';
                    await prisma.task.update({ where: { id: args.id }, data: { isDone, status: args.category || "DONE" } });
                    revalidatePath("/agenda");
                    return `Tarefa ${args.id} atualizada.`;
                }
                break;

            case "FINANCE":
                if (args.action === "CREATE" && args.title && args.value) {
                    const account = await prisma.account.findFirst();
                    if (!account) return "Erro: Nenhuma conta bancária criada.";
                    
                    const type = args.category === "INCOME" ? "INCOME" : "EXPENSE";
                    await prisma.transaction.create({
                        data: { description: args.title, amount: args.value, type, category: args.description || "Geral", accountId: account.id }
                    });
                    
                    const newBalance = type === "INCOME" ? Number(account.balance) + args.value : Number(account.balance) - args.value;
                    await prisma.account.update({ where: { id: account.id }, data: { balance: newBalance } });
                    
                    revalidatePath("/finance");
                    return `Transação de R$ ${args.value} (${type}) adicionada.`;
                }
                break;

            case "HEALTH":
                if (args.action === "CREATE" && args.title) {
                    if (args.category === "WEIGHT" && args.value) {
                        await prisma.bodyMeasurement.create({ data: { weight: args.value, height: 0, gender: "N/A" } });
                        revalidatePath("/health");
                        return `Peso de ${args.value}kg registrado.`;
                    }
                    await prisma.workout.create({
                        data: { title: args.title, type: args.category || "Generico", duration: args.value || 30, intensity: "MEDIUM", notes: args.description }
                    });
                    revalidatePath("/health");
                    return `Treino "${args.title}" registrado.`;
                }
                break;

            case "ENTERTAINMENT":
                if (args.action === "CREATE" && args.title) {
                    await prisma.mediaItem.create({
                        data: { title: args.title, type: args.category || "MOVIE", overview: args.description } // overview mapeado para subtitle no Prisma
                    });
                    revalidatePath("/entertainment");
                    return `Mídia "${args.title}" adicionada.`;
                }
                break;

            case "FRIENDS":
                if (args.action === "CREATE" && args.title) {
                    // Prevenção para garantir que existe um userId vinculável (pegamos o 1º usuário)
                    const user = await prisma.user.findFirst();
                    if (!user) return "Erro: Usuário Mestre não encontrado.";

                    await prisma.friend.create({
                        data: { name: args.title, notes: args.description, userId: user.id }
                    });
                    revalidatePath("/connections");
                    return `Amigo/Contato "${args.title}" salvo.`;
                }
                break;

            case "CRM":
                if (args.action === "CREATE" && args.title) {
                    await prisma.client.create({
                        data: { name: args.title, notes: args.description }
                    });
                    revalidatePath("/business");
                    return `Cliente "${args.title}" salvo no CRM.`;
                }
                break;

            case "VAULT":
                 if (args.action === "CREATE" && args.title && args.description) {
                     await prisma.accessItem.create({
                         data: { title: args.title, username: args.category || "", password: args.description, category: "GERAL" }
                     });
                     revalidatePath("/access");
                     return `Senha/Acesso guardado no cofre.`;
                 }
                 break;
                 
            case "WARDROBE":
                if (args.action === "CREATE" && args.title) {
                    const user = await prisma.user.findFirst();
                    if (!user) return "Erro: Usuário não encontrado.";
                    await prisma.wardrobeItem.create({
                        data: { name: args.title, category: args.category || "GENERAL", userId: user.id }
                    });
                    revalidatePath("/closet");
                    return `Item de guarda-roupa salvo.`;
                }
                break;
        }

        return `Ação ${args.action} incompleta no módulo ${args.module}. Verifique os parâmetros passados.`;
    }

    return "Ferramenta não reconhecida.";
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Falha ao conectar no Prisma.";
    return `Erro crítico ao acessar banco de dados: ${errMessage}`;
  }
}

/* ============================================================================
   4. TRADUTORES DE API (O NÚCLEO DE ROTEAMENTO)
   ============================================================================ */

async function handleGeminiProvider(modelConfig: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[], apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;
    
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

    if (part.functionCall) {
        const args = part.functionCall.args as ToolArgs;
        const result = await executeTool(part.functionCall.name, args);
        
        contents.push({ role: "model", parts: [part] });
        contents.push({ role: "user", parts: [{ functionResponse: { name: part.functionCall.name, response: { result } } }] });

        const secondResponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: payload.systemInstruction, contents, tools: geminiTools }) });
        const secondData = await secondResponse.json();
        return secondData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na segunda iteração do Gemini.";
    }

    return part.text || "";
}

async function handleOpenAILikeProvider(url: string, finalModel: string, apiKey: string, systemPrompt: string, userMessage: string, history: ChatHistoryItem[]): Promise<string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

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

    if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) return aiMsg.content || "";

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
  
  if (provider === 'google') {
      const apiKey = keys.google || process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("Credencial ausente. Cadastre sua API Key do Google Gemini.");
      return await handleGeminiProvider(modelConfig, systemPrompt, userMessage, history, apiKey);
  }

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
          finalModel = modelConfig || "llama3.1";
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

    const fullSystemPrompt: string = `
[IDENTIDADE E PERSONALIDADE]
${customPersona}

[CONTEXTO DE TEMPO E ESPAÇO]
Data e Hora Atual: ${new Date().toLocaleString('pt-BR')}

[LEITURA DE SENSORES DO LIFE OS]
${systemContext}

[DIRETRIZES ESTRITAS DE SISTEMA - NÃO IGNORE]
1. EXECUÇÃO DE TAREFAS: Se o usuário pedir para anotar, criar, agendar, registrar ou deletar algo, VOCÊ DEVE USAR A FERRAMENTA 'mutate_system_data'.
2. BUSCA DE DADOS: Se o usuário pedir resumo, análise ou leitura de dados, VOCÊ DEVE USAR A FERRAMENTA 'query_system_data' ANTES de responder.
3. CONFIANÇA: Você tem acesso TOTAL a Finanças, Tarefas, Saúde, Projetos, Mídia, Clientes e Amigos via Tools.
4. TOM DE VOZ: Mantenha estritamente a [IDENTIDADE E PERSONALIDADE] definida no topo.
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