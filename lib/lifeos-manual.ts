// Onboarding vivo (#30 do roadmap de IA): manifesto ESTÁTICO dos módulos para
// a IA explicar o próprio Life OS ("como funciona o modo réplica?") com
// resposta certa e link — mata a necessidade de documentação para o amigo
// convidado via /register. Tool: explain_feature(area).

export interface FeatureDoc {
  area: string;       // chave canônica
  nome: string;
  rota: string;
  oQueFaz: string;
  comoUsar: string;
}

export const LIFEOS_MANUAL: FeatureDoc[] = [
  {
    area: "dashboard",
    nome: "Dashboard",
    rota: "/dashboard",
    oQueFaz: "Visão geral do dia: briefing da IA, check-in de energia, hábitos, insights de correlação e abas de finanças/produtividade/pessoal.",
    comoUsar: "Comece o dia por aqui. Energia 1-2 ativa o Modo de Preservação (esconde painéis pesados). O briefing da IA se renova a cada dia.",
  },
  {
    area: "financas",
    nome: "Finanças",
    rota: "/finance",
    oQueFaz: "Contas, lançamentos, orçamento, cobranças recorrentes, custos fixos, faturas, wishlist e investimentos.",
    comoUsar: "Lance gastos manualmente, pela Inbox Mágica (Ctrl+J: '50 mercado') ou importando extrato OFX/CSV em Transações → Importar. Cotações da B3 pedem BRAPI_TOKEN nas integrações.",
  },
  {
    area: "projetos",
    nome: "Projetos & Tarefas",
    rota: "/projects",
    oQueFaz: "Projetos com kanban, tarefas com prioridade/vencimento e captura rápida (inbox de 2 minutos no Dashboard).",
    comoUsar: "Tarefas vencidas viram notificação e a IA pode criar/concluir tarefas por você no chat.",
  },
  {
    area: "agenda",
    nome: "Agenda",
    rota: "/agenda",
    oQueFaz: "Calendário unificado: eventos próprios + tudo que tem data nos outros módulos (tarefas, treinos, cobranças).",
    comoUsar: "Crie eventos aqui ou peça à IA ('agende dentista sexta 15h'). Lembretes de blocos avisam antes de começar.",
  },
  {
    area: "saude",
    nome: "Saúde (Treino, Corpo, Nutrição, Sono, Corrida)",
    rota: "/health",
    oQueFaz: "Treinos com sessão ao vivo, fichas compartilháveis, medidas corporais, refeições com macros, sono e hábitos diários.",
    comoUsar: "Use /health/gym/session para treinar com cronômetro de descanso; a ficha pode ser importada por link. Refeições aceitam registro por voz na Inbox Mágica.",
  },
  {
    area: "estudos",
    nome: "Estudos",
    rota: "/studies",
    oQueFaz: "Matérias, sessões de estudo, notas com editor rico (histórico de versões) e flashcards com revisão espaçada.",
    comoUsar: "Notas criadas pela IA caem na Entrada. Peça 'gere flashcards da minha nota X' que a IA cria os cards no deck automaticamente.",
  },
  {
    area: "ia",
    nome: "Cérebro Digital (IA)",
    rota: "/ai",
    oQueFaz: "Chat com 9 provedores (inclui Ollama local), streaming em tempo real, memória persistente, anexos com visão, voz, busca semântica e ferramentas que leem/criam registros em 14 módulos.",
    comoUsar: "Configure a chave em Configurações → IA. Diga 'lembre que...' para memórias; anexe um recibo para virar lançamento; ative voz no microfone do chat. Privacidade: memórias e acesso à web são controláveis nas Configurações.",
  },
  {
    area: "replica",
    nome: "Modo réplica / banco híbrido",
    rota: "/settings?tab=system",
    oQueFaz: "Seu banco local (SQLite) sincronizado com a nuvem (Turso): os dados do PC aparecem no celular e vice-versa.",
    comoUsar: "Em Configurações → Sistema, conecte o banco na nuvem e use o cartão de sincronização. O arquivo local continua sendo a fonte primária no desktop — local-first de verdade.",
  },
  {
    area: "cadastro",
    nome: "Multi-usuário / convidar amigos",
    rota: "/register",
    oQueFaz: "Cada pessoa tem conta própria com dados 100% isolados por usuário.",
    comoUsar: "A primeira conta nasce no /setup; novas pessoas se cadastram em /register e fazem login em /login.",
  },
  {
    area: "social",
    nome: "Conexões (CRM pessoal)",
    rota: "/social",
    oQueFaz: "Amigos e contatos com proximidade, aniversários (viram notificação) e ideias de presente.",
    comoUsar: "Marque o círculo próximo (CLOSE/FAMILY): a IA avisa quando alguém importante está há 60+ dias sem registro.",
  },
  {
    area: "entretenimento",
    nome: "Entretenimento",
    rota: "/entertainment",
    oQueFaz: "Catálogo de filmes/séries/jogos/livros com status e notas.",
    comoUsar: "Pergunte 'o que assisto hoje?' no chat — a IA cruza sua fila com a sua energia do dia para sugerir.",
  },
  {
    area: "cofre",
    nome: "Cofre de Acessos",
    rota: "/access",
    oQueFaz: "Senhas e credenciais cifradas no banco (criptografia local).",
    comoUsar: "A IA pode guardar acessos, mas NUNCA lê senhas de volta — leitura só pela tela do cofre.",
  },
  {
    area: "configuracoes",
    nome: "Configurações",
    rota: "/settings",
    oQueFaz: "Perfil, IA (chaves, persona, memórias, automações, privacidade), integrações, sistema (banco, backups) e segurança.",
    comoUsar: "Tudo da IA vive na aba Inteligência Artificial — incluindo o que ela lembra de você (e o botão de apagar).",
  },
];

/** Busca tolerante: por chave, nome ou texto. */
export function explainFeature(area?: string): Record<string, unknown> {
  if (!area?.trim()) {
    return { areas_disponiveis: LIFEOS_MANUAL.map((f) => ({ area: f.area, nome: f.nome })) };
  }
  const q = area.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hit = LIFEOS_MANUAL.find((f) =>
    f.area.includes(q)
    || f.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)
    || f.oQueFaz.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)
  );
  if (!hit) {
    return {
      erro: `Não achei "${area}".`,
      areas_disponiveis: LIFEOS_MANUAL.map((f) => f.area),
    };
  }
  return { ...hit, instrucao: "Explique com as suas palavras e inclua o link da rota na resposta." };
}
