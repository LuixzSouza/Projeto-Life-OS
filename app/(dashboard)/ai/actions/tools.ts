// Definições de tools (tool-calling) + executor que delega para a camada de
// dados enxuta (lib/ai-data.ts). Módulo server-only: importado só por
// providers.ts / index.ts, nunca por client components.
import { requireUserId } from "@/lib/auth";
import { queryModule, mutateModule } from "@/lib/ai-data";
import { ToolArgs } from "./types";

const MODULES = ["FINANCE", "HEALTH", "TASKS", "PROJECTS", "STUDIES", "ENTERTAINMENT", "CRM", "FRIENDS", "VAULT", "WARDROBE", "AGENDA"] as const;

/* ============================================================================
   FERRAMENTAS (2 tools = menos schema = menos token)
   ============================================================================ */
export const tools = [
  {
    type: "function",
    function: {
      name: "query_system_data",
      description:
        "LÊ dados do Life OS de forma econômica. Para perguntas de 'quanto/quantos/resumo' use mode='summary' (agregações prontas, barato). Para listar registros use mode='list' com search/limit. Sempre prefira summary e busca específica em vez de listar tudo. Retorna campos compactos + total + hasMore.",
      parameters: {
        type: "object",
        properties: {
          module: { type: "string", enum: MODULES, description: "Área a consultar. AGENDA=eventos futuros." },
          mode: { type: "string", enum: ["list", "summary"], description: "summary = contagens/somatórios (barato). list = registros." },
          search: { type: "string", description: "Filtro de texto (nome/título/descrição). Use para achar um registro específico." },
          status: { type: "string", description: "Filtro por status (ex: TODO, DONE, ACTIVE, COMPLETED)." },
          category: { type: "string", description: "Filtro por categoria/tipo." },
          limit: { type: "number", description: "Máx. de registros (padrão 5, teto 25)." },
          offset: { type: "number", description: "Paginação: pular N registros." },
        },
        required: ["module"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mutate_system_data",
      description:
        "CRIA, ATUALIZA ou APAGA registros. UPDATE/DELETE exigem 'id' (busque antes com query_system_data). DELETE é em 2 passos: chame sem confirm para ver o que será apagado e peça confirmação ao usuário; só apague com confirm=true. Mapeamento por módulo: TASKS(title, description, category=prioridade, status, date=vencimento) · FINANCE(title=descrição, value, category=INCOME|EXPENSE, description=categoria, date) · HEALTH(title, value=minutos, category=tipo; ou category=WEIGHT+value=kg) · STUDIES(value=minutos+category=matéria para sessão; ou title+description para anotação) · ENTERTAINMENT(title, category=tipo, status, value=nota) · AGENDA(title, date, category=local) · CRM/FRIENDS(title=nome, category=empresa, description=notas) · PROJECTS(title, description, status) · VAULT(title, category=usuário, description=senha) · WARDROBE(title=nome, category, description=marca).",
      parameters: {
        type: "object",
        properties: {
          module: { type: "string", enum: MODULES },
          action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE"] },
          id: { type: "string", description: "Obrigatório para UPDATE e DELETE." },
          confirm: { type: "boolean", description: "Só para DELETE: true confirma a exclusão após o usuário aprovar." },
          title: { type: "string", description: "Título/nome principal." },
          description: { type: "string", description: "Notas, detalhes ou senha (ver mapeamento)." },
          value: { type: "number", description: "Número (R$, minutos, kg, nota...)." },
          category: { type: "string", description: "Categoria, tipo, prioridade ou matéria (ver mapeamento)." },
          status: { type: "string", description: "Status do registro." },
          date: { type: "string", description: "Data ISO (YYYY-MM-DD)." },
        },
        required: ["module", "action"],
      },
    },
  },
];

/* ============================================================================
   EXECUTOR — valida o usuário e delega para a camada de dados enxuta
   ============================================================================ */
export async function executeTool(name: string, args: ToolArgs): Promise<string> {
  console.log(`[CÉREBRO DIGITAL]: ${name}`, args);
  try {
    const userId = await requireUserId();

    if (name === "query_system_data") {
      return JSON.stringify(await queryModule(userId, args));
    }
    if (name === "mutate_system_data") {
      const result = await mutateModule(userId, args);
      return JSON.stringify(result);
    }
    return "Ferramenta não reconhecida.";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Falha ao acessar o banco.";
    return JSON.stringify({ ok: false, erro: `Erro ao acessar dados: ${msg}` });
  }
}
