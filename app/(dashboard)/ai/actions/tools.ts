// Definições de tools (tool-calling) + executor que delega para a camada de
// dados enxuta (lib/ai-data.ts). Módulo server-only: importado só por
// providers.ts / index.ts, nunca por client components.
import { requireUserId } from "@/lib/auth";
import { queryModule, mutateModule, manageMemory, analyzeModule } from "@/lib/ai-data";
import { semanticSearch } from "@/lib/ai-embeddings";
import { isWebEnabled, readUrl, webSearch, WEB_DISABLED_MSG } from "@/lib/ai-web";
import { findCorrelations, projectFuture } from "@/lib/ai-insights";
import { generateFlashcards, expertCouncil, curateMedia, gameMasterData } from "@/lib/ai-creative";
import { auditSubscriptions, cleanupScan } from "@/lib/ai-maintenance";
import { explainFeature } from "@/lib/lifeos-manual";
import { ToolArgs } from "./types";

const MODULES = ["FINANCE", "HEALTH", "TASKS", "PROJECTS", "STUDIES", "ENTERTAINMENT", "CRM", "FRIENDS", "VAULT", "WARDROBE", "AGENDA", "NUTRITION", "SLEEP", "HABITS"] as const;

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
          module: { type: "string", enum: MODULES, description: "Área a consultar. AGENDA=eventos futuros · NUTRITION=refeições/calorias · SLEEP=noites de sono · HABITS=hábitos (status de hoje)." },
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
        "CRIA, ATUALIZA ou APAGA registros. UPDATE/DELETE exigem 'id' (busque antes com query_system_data). DELETE é em 2 passos: chame sem confirm para ver o que será apagado e peça confirmação ao usuário; só apague com confirm=true. Mapeamento por módulo: TASKS(title, description, category=prioridade, status, date=vencimento) · FINANCE(title=descrição, value, category=INCOME|EXPENSE, description=categoria, date) · HEALTH(title, value=minutos, category=tipo; ou category=WEIGHT+value=kg; ou category=ENERGY+value=1-5+description=nota p/ check-in do dia) · STUDIES(value=minutos+category=matéria para sessão; ou title+description para anotação) · ENTERTAINMENT(title, category=tipo, status, value=nota) · AGENDA(title, date, category=local) · CRM/FRIENDS(title=nome, category=empresa, description=notas) · PROJECTS(title, description, status) · VAULT(title, category=usuário, description=senha) · WARDROBE(title=nome, category, description=marca) · NUTRITION(title=refeição, value=kcal, category=BREAKFAST|LUNCH|SNACK|DINNER, description=itens, date) · SLEEP(value=horas dormidas, date; 1 registro por dia) · HABITS(CREATE: title=nome do hábito; UPDATE com status=DONE|FAILED marca o hábito no dia).",
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
  {
    type: "function",
    function: {
      name: "analyze_system_data",
      description:
        "ANÁLISES agregadas em UMA chamada (muito mais barato que vários query). COMPARE: compara uma métrica entre dois meses (periodA/periodB = YYYY-MM) — use para 'gastei mais que mês passado?'. TREND: série diária da métrica nos últimos N dias (days, padrão 30, máx 90) com média/min/máx/tendência — use para 'como está meu peso/sono/gasto?'. GROUP: agrupamento pronto por módulo (FINANCE=despesas do mês por categoria · TASKS=por status · ENTERTAINMENT=por status · NUTRITION=refeições do mês por tipo · HEALTH=treinos do mês por tipo · PROJECTS=por status · WARDROBE=por categoria). Métricas: EXPENSE, INCOME, WEIGHT, SLEEP, WORKOUTS, STUDY_MINUTES, CALORIES.",
      parameters: {
        type: "object",
        properties: {
          analysis: { type: "string", enum: ["COMPARE", "TREND", "GROUP"] },
          metric: { type: "string", enum: ["EXPENSE", "INCOME", "WEIGHT", "SLEEP", "WORKOUTS", "STUDY_MINUTES", "CALORIES"], description: "Exigida em COMPARE e TREND." },
          periodA: { type: "string", description: "COMPARE: mês base, YYYY-MM." },
          periodB: { type: "string", description: "COMPARE: mês a comparar, YYYY-MM." },
          days: { type: "number", description: "TREND: janela em dias (7–90, padrão 30)." },
          module: { type: "string", enum: ["FINANCE", "TASKS", "ENTERTAINMENT", "NUTRITION", "HEALTH", "PROJECTS", "WARDROBE"], description: "Exigido em GROUP." },
        },
        required: ["analysis"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "semantic_search",
      description:
        "Busca SEMÂNTICA nos dados do Life OS (transações, notas, tarefas, refeições, treinos) — entende o SIGNIFICADO, não só palavras exatas. Use quando o usuário descrever algo vagamente ('aquele gasto do carro mês passado', 'a nota sobre investimentos') ou quando query_system_data com search não encontrar nada. Retorna trechos ranqueados por similaridade com id e tipo do registro.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "O que procurar, em linguagem natural." },
          topK: { type: "number", description: "Quantos resultados (padrão 8, máx 15)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_correlations",
      description:
        "Encontra PADRÕES CRUZADOS entre módulos nos últimos 90 dias (sono×treino, energia×treino, gasto×sono, estudo×dia da semana, gasto×dia da semana). Os números vêm prontos do banco — apenas NARRE o que eles mostram, nunca extrapole além da amostra. Use para 'que padrões você vê em mim?' ou em retrospectivas.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "project_future",
      description:
        "SIMULADOR 'e se?': projeções lineares com premissas explícitas. projection=EXPENSE (gasto projetado p/ fim do mês e horizonte) · WEIGHT (peso estimado pela tendência das pesagens) · WISHLIST (semanas até cada item, pela sobra mensal REAL). days = horizonte em dias (padrão 90). Sempre cite a premissa ao responder.",
      parameters: {
        type: "object",
        properties: {
          projection: { type: "string", enum: ["EXPENSE", "WEIGHT", "WISHLIST"] },
          days: { type: "number", description: "Horizonte em dias (7–365, padrão 90)." },
        },
        required: ["projection"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_flashcards",
      description:
        "Gera FLASHCARDS de estudo a partir de uma anotação (StudyNote) e salva no deck correspondente. Fluxo: ache a nota com query_system_data (STUDIES) se não tiver o id; depois chame com noteId. Os cards entram direto na fila de revisão.",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "Id da StudyNote." },
          count: { type: "number", description: "Quantos cards (3–15, padrão 8)." },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "expert_council",
      description:
        "CONSELHO DE ESPECIALISTAS para decisões difíceis ('devo trocar de carro?'): a mesma pergunta passa por 3 personas (consultor financeiro com os números reais do usuário, minimalista e entusiasta). Use o retorno para sintetizar um veredito equilibrado. Reserve para decisões relevantes — custa 3 chamadas de IA.",
      parameters: {
        type: "object",
        properties: { question: { type: "string", description: "A decisão/pergunta do usuário." } },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "curate_media",
      description:
        "CURADOR de filmes/séries: devolve numa chamada o estado do dia (energia/humor do check-in), o que está em andamento, a fila 'quero ver' e os favoritos 5 estrelas. Use quando o usuário perguntar 'o que assisto hoje?' e cruze humor × catálogo na resposta.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "game_master",
      description:
        "MESTRE DE JOGO: devolve numa chamada o perfil gamificado REAL do usuário — sequências de hábitos, desafios ativos com progresso, treinos mês a mês, estudo da semana e pontos fracos (hábitos que mais falham). Use para celebrar conquistas com narrativa épica personalizada e propor desafios sob medida.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "audit_subscriptions",
      description:
        "CAÇADOR DE ASSINATURAS: varre 6 meses de transações e devolve (a) cobranças recorrentes que NÃO estão cadastradas como recorrência e (b) aumentos de preço (≥10%). Use quando o usuário pedir auditoria de assinaturas/gastos fixos ou perguntar 'o que subiu de preço?'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "system_cleanup_scan",
      description:
        "FAXINEIRO: varre o sistema e devolve candidatos a limpeza — tarefas paradas há 90+ dias, projetos zumbis, duplicatas prováveis, notas esquecidas na Entrada, mídia 'assistindo' há 1 ano. Apenas PROPONHA item a item; qualquer exclusão segue o fluxo de confirmação em 2 passos.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_feature",
      description:
        "MANUAL VIVO do Life OS: explica como funciona qualquer área do sistema (dashboard, finanças, réplica/sincronização, cadastro de amigos, cofre...). Sem area, lista as áreas. Use quando o usuário perguntar 'como funciona/onde fica X' sobre o PRÓPRIO app.",
      parameters: {
        type: "object",
        properties: { area: { type: "string", description: "Área/tema (ex.: 'replica', 'finanças', 'flashcards')." } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Busca na INTERNET (notícias, preços, fatos atuais). Recurso OPT-IN: só funciona se o usuário ativou 'Acesso à web' nas Configurações — se vier desativado, não insista. Use apenas para informação externa ao Life OS.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "O que buscar." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_url",
      description:
        "LÊ uma página da web (texto extraído, até ~4000 caracteres). Recurso OPT-IN ('Acesso à web' nas Configurações). Use quando o usuário colar um link ou após web_search para aprofundar num resultado.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "URL http(s) completa." } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_memory",
      description:
        "MEMÓRIA PERSISTENTE entre conversas. SAVE: grava um fato curto e durável sobre o usuário — use quando ele pedir explicitamente ('lembre que...') ou revelar uma preferência/contexto importante e duradouro. LIST: lista as memórias salvas (id + texto). DELETE: apaga uma memória pelo id (faça LIST antes se não tiver o id). Fatos devem ter no máximo 1 frase; nunca salve segredos/senhas.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["SAVE", "LIST", "DELETE"] },
          content: { type: "string", description: "Para SAVE: o fato a lembrar (1 frase curta)." },
          id: { type: "string", description: "Para DELETE: id da memória." },
        },
        required: ["action"],
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
    if (name === "analyze_system_data") {
      return JSON.stringify(await analyzeModule(userId, args));
    }
    if (name === "manage_memory") {
      return JSON.stringify(await manageMemory(userId, args));
    }
    if (name === "semantic_search") {
      return JSON.stringify(await semanticSearch(userId, args.query ?? "", args.topK));
    }
    if (name === "find_correlations") {
      return JSON.stringify(await findCorrelations(userId));
    }
    if (name === "project_future") {
      if (!args.projection) return JSON.stringify({ erro: "Informe projection: EXPENSE, WEIGHT ou WISHLIST." });
      return JSON.stringify(await projectFuture(userId, args.projection, args.days));
    }
    if (name === "generate_flashcards") {
      if (!args.noteId) return JSON.stringify({ erro: "Informe o noteId (busque a nota em STUDIES antes)." });
      return JSON.stringify(await generateFlashcards(userId, args.noteId, args.count ?? 8));
    }
    if (name === "expert_council") {
      return JSON.stringify(await expertCouncil(userId, args.question ?? ""));
    }
    if (name === "curate_media") {
      return JSON.stringify(await curateMedia(userId));
    }
    if (name === "game_master") {
      return JSON.stringify(await gameMasterData(userId));
    }
    if (name === "audit_subscriptions") {
      return JSON.stringify(await auditSubscriptions(userId));
    }
    if (name === "system_cleanup_scan") {
      return JSON.stringify(await cleanupScan(userId));
    }
    if (name === "explain_feature") {
      return JSON.stringify(explainFeature(args.area));
    }
    if (name === "web_search" || name === "read_url") {
      // Gate de privacidade: web é OPT-IN explícito nas Configurações.
      if (!(await isWebEnabled(userId))) return JSON.stringify({ erro: WEB_DISABLED_MSG });
      if (name === "web_search") return JSON.stringify(await webSearch(args.query ?? ""));
      return JSON.stringify(await readUrl(args.url ?? ""));
    }
    return "Ferramenta não reconhecida.";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Falha ao acessar o banco.";
    return JSON.stringify({ ok: false, erro: `Erro ao acessar dados: ${msg}` });
  }
}
