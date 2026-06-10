# 🧠 Roadmap do Cérebro Digital — o que falta para uma IA nível Claude

> Mapeamento honesto da distância entre a IA atual do Life OS e um assistente
> de primeira linha (Claude/ChatGPT), priorizado por impacto × esforço.
> Atualizado em 10/jun/2026. Arquivos citados são os reais do projeto.

---

## ✅ O que JÁ temos (base sólida — não subestimar)

| Capacidade | Onde vive |
|---|---|
| Loop agêntico multi-passo (ler → agir → confirmar, até 6 rodadas) | `app/(dashboard)/ai/actions/providers.ts` |
| 9 provedores (Claude, GPT, Gemini, Groq, DeepSeek, Mistral, Grok, OpenRouter, Ollama local) | `lib/ai-models.ts` + `providers.ts` |
| 2 tools econômicas cobrindo **14 módulos** (CRUD + resumos agregados) | `actions/tools.ts` + `lib/ai-data.ts` |
| Confirmação de exclusão em 2 passos (marcador invisível entre turnos) | `lib/ai-help.ts` (PENDING) |
| Cards de ação clicáveis ("Criado · Tarefa → link") | `chat-interface.tsx` (ACTIONS) |
| Conversa por IA + regenerar + editar & reenviar sem duplicar | `actions/index.ts` (`generateAssistantReply`) |
| Persona customizável, snapshot compacto do sistema, telemetria de uso | `lib/ai-context.ts`, Settings |
| Deep-link `?q=` + botões "Analisar com IA" nos módulos | `components/ai/ask-ai-button.tsx` |
| One-shot AI com fallback local (nada quebra sem IA) | `actions/oneshot.ts` |
| Resiliência: retry com backoff, reparo de JSON de tool call | `providers.ts` (`fetchProvider`) |

---

## 🥇 TIER 1 — Fundação que mais muda a sensação de "IA de verdade"

### 1. Streaming real (SSE) — a maior diferença visível
**Hoje:** a resposta chega inteira e um typewriter *simula* digitação (`AssistantContent`).
**Claude:** tokens aparecem conforme são gerados; em respostas de 30s a diferença é brutal.
**Como:** trocar a Server Action por um **route handler** (`app/api/ai/chat/route.ts`) que
devolve `ReadableStream`; cada provedor tem flag `stream: true` (OpenAI-like) ou
`streamGenerateContent` (Gemini). O loop agêntico complica: streamar só o turno final
e mostrar "executando ferramenta X..." nos intermediários (os eventos de status já
existem visualmente no `LoadingLabel`).
**Esforço:** alto (reescrever o transporte; manter Server Action como fallback).
**Pré-requisito de UX já pronto:** efeito de digitação, status rotativo.

### 2. Memória persistente entre conversas (o "lembre-se disso")
**Hoje:** cada conversa é isolada; a IA só vê snapshot + 10 últimas mensagens.
**Claude:** memória de fatos do usuário que sobrevive entre chats.
**Como (barato e nosso estilo):** tabela `AiMemory { id, userId, content, createdAt }`
+ 3ª tool `manage_memory(action: SAVE|LIST|DELETE, content)` + injetar as N memórias
no system prompt (são curtas). A IA salva quando o usuário diz "lembre que...".
UI: aba "Memórias da IA" nas Configurações (ver/apagar — privacidade em 1º lugar).
**Esforço:** médio. **Schema:** 1 modelo novo (lembrar fluxo réplica: baseline + turso-reconcile).

### 3. Busca semântica no próprio Life OS (RAG local)
**Hoje:** `query_system_data` busca por `contains` (texto exato).
**Claude:** entende "aquele gasto do mês passado com o carro" sem palavras exatas.
**Como:** embeddings locais (Ollama `nomic-embed-text` grátis) ou da API do provedor;
tabela `Embedding { entityType, entityId, vector }` (vector = JSON; SQLite não tem
pgvector — busca por cosseno em memória resolve para escala pessoal, < 50k registros).
Indexar: transações, notas, tarefas, refeições. Nova tool `semantic_search(query)`.
**Esforço:** alto. **Alternativa curta:** melhorar o `search` atual com normalização
(acentos/caixa) e busca em múltiplos campos — 20% do esforço, 60% do ganho.

### 4. Anexos no chat: imagens e PDFs (visão)
**Hoje:** só texto. (O import de extrato já usa IA para ler texto colado!)
**Claude:** cola um print/recibo/PDF e conversa sobre ele.
**Como:** upload base64 no composer (já temos `compressImageFile` em `lib/image.ts`),
enviar como bloco de imagem (Claude/GPT-4o/Gemini suportam visão na mesma API).
Casos matadores no Life OS: foto de recibo → lançamento; print de treino → registro;
foto do prato → refeição estimada. PDF: extrair texto com `pdf-parse` e anexar.
**Esforço:** médio (UI do composer + ramo multimodal por provedor + limite de tamanho).

---

## 🥈 TIER 2 — Diferenciais que fazem "uau"

### 5. Briefing diário proativo (a IA que fala primeiro)
A IA gera um resumo matinal no Dashboard: agenda do dia, tarefas críticas, saldo,
sequência de hábitos. Usa `runOneShotAi` (já existe, com fallback local!) + cache
de 1 dia em tabela ou em `Settings.aiUsage`-like. Botão "aprofundar" → `/ai?q=...`.
**Esforço:** baixo-médio. Melhor custo×benefício do Tier 2.

### 6. Sugestões de follow-up (chips pós-resposta)
Depois de cada resposta, 2-3 chips clicáveis ("E em relação ao mês passado?",
"Registrar isso"). Gerar na MESMA chamada: instruir o modelo a terminar com um
bloco `<!--SUGGEST:...-->` (mesmo padrão dos marcadores PENDING/ACTIONS já prontos).
**Esforço:** baixo. Aproveita 100% da infra de marcadores.

### 7. Tools de análise (não só CRUD)
- `compare_periods(module, period_a, period_b)` — "gastei mais que mês passado?"
- `get_trends(metric, days)` — série temporal de peso/sono/gasto p/ a IA comentar.
- `aggregate_by(module, dimension)` — agrupamentos sob demanda.
Hoje a IA improvisa com vários `query` (caro e lento). SQL agregado = 1 chamada.
**Esforço:** médio (só `lib/ai-data.ts` + descrição da tool).

### 8. Modo voz (ditado + leitura)
Web Speech API (grátis, nativa do navegador): botão de microfone no composer
(`SpeechRecognition` pt-BR) + opcional `speechSynthesis` para ler a resposta.
Mobile/PWA é onde brilha (registrar refeição falando, mãos ocupadas na cozinha).
**Esforço:** baixo (Chrome/Edge) — Safari tem suporte parcial, degradar com graça.

### 9. Artefatos leves (preview estruturado)
Quando a resposta contém tabela/plano/lista grande, renderizar num painel destacável
com botões "Exportar .md" (já temos a infra de export!) e "Salvar como nota"
(tool de STUDIES já cria nota na Entrada). Não precisa de iframe/sandbox como o
Claude — um card rico já entrega o valor.
**Esforço:** médio.

---

## 🥉 TIER 3 — Visão de longo prazo

### 10. Automações agendadas ("toda sexta me mande o resumo financeiro")
Precisa de um runner de jobs (no desktop: `setInterval` no processo do servidor já
basta; na Vercel: cron jobs). Tabela `AiAutomation { schedule, prompt, lastRun }` +
resultado vira Notificação (módulo já existe) com link para a conversa.
**Esforço:** alto (infra de agendamento + idempotência entre réplica/nuvem).

### 11. Acesso à web (busca + leitura de URLs)
Tool `web_search` — exige API externa (Tavily/Brave têm tier grátis; Gemini tem
grounding nativo). Tool `read_url` é mais simples: `fetch` + extração de texto.
Cuidado com a filosofia local-first: deixar OPT-IN explícito nas Configurações.
**Esforço:** médio. **Decisão de produto antes de código.**

### 12. Sub-agentes / planejamento explícito
Para pedidos compostos ("organize minha semana"): um passo de PLANEJAMENTO que lista
as ações, mostra ao usuário (UI de checklist), e executa item a item com progresso.
É a evolução natural do loop atual (`MAX_STEPS=6` → plano visível e retomável).
**Esforço:** alto.

### 13. Métricas de token reais (em vez de chars/4)
Os provedores devolvem `usage` em cada resposta — basta capturar em `providers.ts`
e somar em `aiUsage`. Precisão de verdade no HUD, custo estimado em R$ por conversa.
**Esforço:** baixo. (Fazer junto com qualquer mexida no providers.)

### 14. Fila offline / PWA do chat
O gym já tem `PendingSessionsSync`; replicar a ideia: mensagem enviada sem rede
fica na fila (localStorage) e despacha ao reconectar.
**Esforço:** médio.

---

## 🗺️ Ordem recomendada (impacto ÷ esforço)

1. **#6 Sugestões de follow-up** (baixo esforço, infra pronta, melhora toda conversa)
2. **#13 Tokens reais** (baixo, dá precisão ao HUD que acabamos de melhorar)
3. **#5 Briefing diário** (one-shot pronto, vira a cara do Dashboard)
4. **#2 Memória persistente** (o "lembre-se" é o que mais aproxima do Claude no uso pessoal)
5. **#8 Modo voz** (baixo esforço, efeito demo gigante no celular)
6. **#7 Tools de análise** (faz as perguntas dos botões "Analisar com IA" voarem)
7. **#4 Anexos/visão** (recibo→lançamento é killer feature de Life OS)
8. **#1 Streaming SSE** (o mais visível, mas o mais invasivo — fazer com calma)
9. **#3 RAG semântico** (depois da memória, quando o volume de dados justificar)
10. Tier 3 conforme apetite.

---

## 🚀 TIER 4 — Fora da casinha: a IA como sistema operacional da vida

> A vantagem injusta do Life OS sobre o Claude: o Claude não sabe NADA de você;
> nossa IA tem finanças + saúde + estudos + relações + agenda **no mesmo banco**.
> As features abaixo só existem aqui — nenhum chatbot genérico consegue copiá-las.

### A. Inteligência cruzada (o superpoder do banco único)

**15. Motor de correlações entre módulos**
"Você dorme em média 1h a menos em dias sem treino" · "Seus gastos por impulso
sobem 40% nas semanas de sono ruim" · "Você estuda melhor às terças".
SQL puro cruzando `HealthMetric` × `Workout` × `Transaction` × `StudySession` ×
`FocusSession` — a IA só NARRA o que os números mostram (zero alucinação).
Vira: card no Dashboard + tool `find_correlations()` + assunto do briefing diário.
**Por que é único:** exige todos os dados juntos. É O argumento do Life OS.

**16. Detector de anomalias (a IA puxa assunto)**
Job leve que roda no load do Dashboard: gasto 3× acima da média da categoria,
sono caindo 3 dias seguidos, hábito quebrado após sequência longa, amigo próximo
(`Friend.proximity`) sem contato há 60 dias → vira `Notification` (modelo já existe)
com link `/ai?q=...` para conversar sobre. A IA deixa de ser reativa.

**17. Simulador de futuro ("e se?")**
"Se continuar nesse ritmo de gasto, dezembro fecha em R$ X" · "Nesse ritmo de
treino, sua projeção de peso em 3 meses é Y" · "Economizando R$ 20/dia, o item
da wishlist (`WishlistItem`) sai em N semanas". Projeção linear/média móvel em SQL
+ IA explicando premissas. Tool `project_future(metric, horizon)`.

**18. Retrospectiva semanal/mensal automática (Coach)**
Domingo à noite: a IA monta a retro da semana (vitórias, derrapadas, comparativo
com a anterior) e propõe 3 intenções para a próxima — que viram tarefas se você
aceitar (1 clique, via tool de TASKS). Mensal: "Relatório de Vida" exportável em
PDF usando o `components/pdf/pdf-kit.tsx` que já existe.

### B. Captura sem fricção (a IA como porta de entrada do sistema)

**19. Inbox Mágica (Ctrl+K global → "despeje aqui")**
UMA caixa de texto global no layout: você escreve "50 mercado, dentista sexta 15h,
ideia: app de receitas" → a IA classifica e cria gasto + evento + nota, mostrando
preview confirmável. Mata a fricção de navegar até cada módulo. É o quick-capture
do Things/Todoist, mas com linguagem natural e multi-registro.
**Infra pronta:** loop agêntico já cria tudo isso; falta só o componente global.

**20. Modo voz + Inbox = registrar a vida falando**
No PWA do celular: segurar o botão do cérebro, falar "almocei frango com arroz e
600 calorias", soltar. Web Speech API (grátis) → Inbox Mágica → registro confirmado
por voz sintetizada. Mãos ocupadas, vida registrada.

**21. Check-in noturno guiado (journaling com IA)**
20h30: notificação "como foi o dia?". Conversa de 3 perguntas (energia, destaque,
amanhã) → IA grava `EnergyCheckin` (modelo já existe!) + nota de diário + ajusta
prioridades de amanhã. O hábito de journaling sem a página em branco.

### C. Conhecimento & criatividade

**22. Gerador de flashcards das suas notas**
Tool `generate_flashcards(noteId)`: a IA lê a `StudyNote` e cria cards no
`FlashcardDeck` (modelos já existem). Estudou → revisou → memorizou, sem digitar
cards na mão. Bônus: quiz oral no modo voz ("me pergunte sobre a aula de ontem").

**23. Conselho de Especialistas (multi-persona)**
Pergunta difícil ("devo trocar de carro?") → a MESMA pergunta passa por 3 personas
(consultor financeiro vê suas finanças; minimalista questiona; entusiasta apoia)
e um veredito final. 3 chamadas one-shot + síntese. Teatral, MAS força a IA a
usar dados reais de ângulos diferentes — decisões melhores de verdade.

**24. Curador de mídia pessoal**
"O que assisto hoje?" → IA cruza seu catálogo (`MediaItem` + ratings + status) com
seu humor/energia do dia ("você deu 5 estrelas para X e Y; hoje seu dia foi pesado —
sugiro a comédia Z da sua lista"). Com TMDB key: busca similares fora do catálogo.

### D. Dinheiro trabalhando sozinho

**25. Categorizador contínuo + assinatura-caçador**
Toda importação de extrato passa pela IA para categorizar (já existe no import!) —
estender para: detectar cobranças recorrentes novas (`RecurringCharge`), avisar
de aumento de preço ("Netflix subiu R$ 5") e assinatura esquecida sem uso citado.

**26. Plano de compra negociado (wishlist → meta)**
Item na wishlist → "quer que eu monte o plano?" → IA calcula prazo realista olhando
sua sobra média mensal REAL, cria meta + acompanha no briefing ("faltam 3 semanas
para o monitor"). Conecta desejo → comportamento → conquista.

### E. O sistema cuidando de si

**27. Roteador de privacidade (sensível → local, genérico → nuvem)**
Pergunta envolve VAULT/saúde íntima/finanças detalhadas? Roteia para o Ollama
local automaticamente (se disponível); genérica vai para a nuvem rápida.
Config: "Política de privacidade da IA" nas Configurações. Local-first DE VERDADE —
nenhum concorrente de nuvem pode oferecer isso.

**28. Roteador de custo (modelo certo pra cada pergunta)**
Classificador barato (regex/heurística, sem IA): "oi" → Haiku/Flash-Lite;
"analise meu ano financeiro" → Sonnet/GPT-4o. Usuário define teto mensal em R$;
o HUD (que já estimamos) passa a mostrar custo real por conversa.

**29. Faxineiro do sistema**
Mensal: a IA varre e propõe (nunca executa sozinha): tarefas mortas há 90 dias,
projetos zumbis, duplicatas prováveis, notas órfãs sem notebook, mídia "assistindo"
há 1 ano. Lista confirmável item a item — usa o fluxo de confirmação que já existe.

**30. Onboarding vivo ("como eu uso isso?")**
A IA conhece o próprio Life OS: tool `explain_feature(area)` lendo um manifesto
estático dos módulos. Usuário novo pergunta "como funciona o modo réplica?" e
recebe resposta certa com link. Mata a necessidade de documentação para o amigo
que você convidar (`/register` já existe).

### F. Gamificação narrada

**31. Mestre de Jogo da sua vida**
`UserStats` e `Challenge` já existem! A IA vira o narrador: conquista desbloqueada
com texto épico personalizado ("3 semanas de treino sem falhar — o você de janeiro
não aguentaria 10 minutos do seu treino de hoje"), desafios sob medida propostos
pela IA com base nos seus pontos fracos REAIS (dados, não genérico).

---

## 🧭 Como navegar os Tiers

- **Tiers 1–3** = paridade com Claude (transporte, memória, percepção).
- **Tier 4** = o que o Claude NUNCA terá: seus dados, sua vida, num banco só.
- Estratégia: alternar — 1 item de fundação, 1 de Tier 4 (visível e único), repetir.
- Combos naturais: 19+20 (Inbox+voz), 15+16+18 (correlações→anomalias→retro),
  22 depois de 2 (flashcards ganham com memória), 27 depois de 28 (os dois roteadores
  compartilham o classificador).

---

## ⚠️ Regras de ouro ao implementar (lições já aprendidas no projeto)

- **Nada quebra sem IA**: toda feature precisa de fallback local (padrão do `oneshot.ts`).
- **Todo modelo precisa de tool-calling** — nada de adicionar modelo "reasoner" no catálogo.
- **Schema novo = fluxo réplica**: `npm run db:baseline` → `node scripts/turso-reconcile.mjs`
  → sync da réplica (ver memória do projeto; `prisma db push` sozinho NÃO basta).
- **Economia de token é arquitetura**, não detalhe: projeções compactas, summaries SQL,
  poucas tools com schema enxuto. Cada feature nova deve responder "quanto custa por turno?".
- **Privacidade**: memórias/embeddings/automações são dados sensíveis — sempre visíveis
  e apagáveis nas Configurações, sempre escopados por `userId`.

> ok importante ser detalhista em pequenos detalhes que fazem a diferença para trazer para o design da nossa IA para melhorar ela  

---

## 📌 Status — 10/jun/2026 (rodada de implementação concluída)

Validação final: `npx tsc --noEmit` **OK** · `npm run lint` **0 erros** (12 warnings
pré-existentes de `<img>` base64, intencionais no padrão local-first).

### Feito nesta rodada
- ✅ **#1 Streaming SSE** — texto chega token a token no chat, com status das tools
- ✅ **#2 Memória persistente** — `AiMemory` + tool `manage_memory` + card nas Configurações
- ✅ **#4 Anexos/visão** — imagens no composer com preview, ramo multimodal por provedor
- ✅ **#5 Briefing diário** — `components/dashboard/ai-briefing-card.tsx` + `actions/briefing.ts`
- ✅ **#6 Sugestões de follow-up** — marcador SUGGEST (`actions/core.ts`)
- ✅ **#7/#15/#17 Tools de análise** — `find_correlations`, `project_future` (`lib/ai-insights.ts`)
- ✅ **#8/#20 Modo voz** — ditado + leitura de resposta (`components/ai/voice.ts`)
- ✅ **#11 Acesso à web (opt-in)** — tools `web_search` + `read_url`
- ✅ **#13 Tokens reais** — acumulador de `usage` por rodada do loop (`providers.ts`)
- ✅ **#14 Fila offline** — mensagens sem rede entram na fila e despacham no `online`
- ✅ **#16 Detector de anomalias** — `lib/ai-insights.ts` → Notificações
- ✅ **#19 Inbox Mágica** — `components/ai/magic-inbox.tsx` global no layout
- ✅ **#22 Flashcards** — tool `generate_flashcards` (`lib/ai-creative.ts`)
- ✅ **#23 Conselho de Especialistas** — tool `expert_council`
- ✅ **#24 Curador de mídia** — tool `curate_media`
- ✅ **#30 Onboarding vivo** — tool `explain_feature` + `lib/lifeos-manual.ts`
- ✅ **#31 Mestre de Jogo** — tool `game_master` (`gameMasterData`: sequências reais,
  desafios, pontos fracos — a IA narra com dados, zero alucinação)
- ✅ **Detalhes de UX**: separador de dia entre mensagens ("Hoje/Ontem/08 jun"),
  blocos de código com botão copiar, atalho `/` foca o composer, carimbo de hora+modelo

### Ainda aberto (próximas rodadas)
- ⬜ **#3 RAG semântico** — quando o volume de dados justificar
- ⬜ **#10 Automações agendadas** — exige runner de jobs (desktop × Vercel)
- ⬜ **#12 Sub-agentes/planejamento explícito** — evolução do loop atual
- ⬜ **#18 Retrospectiva semanal (Coach)** · **#21 Check-in noturno guiado**
- ⬜ **#25–#29** — caçador de assinaturas, plano de compra, roteadores de
  privacidade/custo, faxineiro do sistema

