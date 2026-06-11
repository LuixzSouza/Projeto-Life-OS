# Roadmap — Botões e Recursos de IA (auditoria 11/06/2026)

Varredura de **todos os pontos de entrada de IA** do Life OS, com status verificado por
revisão estática do código (fluxo completo: botão → action → provedor → banco → UI).

Legenda: ✅ funcionando · 🔧 estava quebrado e **foi corrigido nesta rodada** · ⚠️ depende de configuração (comportamento esperado).

## 1. Cérebro Digital (chat `/ai`)

| Recurso | Status | Observação |
|---|---|---|
| Chat com streaming SSE + fallback de action | ✅ | `sendMessageCore` → `callAIProvider` |
| Troca de provedor/modelo abre conversa nova | ✅ | evita histórico misturado |
| Roteador de privacidade (sensível → Ollama) | ⚠️ | opt-in nas Configurações; exige Ollama vivo |
| Roteador de custo (trivial → modelo barato) | ⚠️ | opt-in nas Configurações |
| Visão (anexar imagens) | ✅ | imagem viaja só no turno em que foi anexada |
| Voz (ditado → `/api/transcribe`) | ✅ | Groq → OpenAI 4o-mini com fallback |
| Sugestões de continuação (chips) | ✅ | marcador `<!--SUGGEST-->` extraído no servidor |
| Cards de ação concluída + confirmação de DELETE | ✅ | marcadores PENDING/ACTIONS |

### Tools do chat (17)

| Tool | Status | Observação |
|---|---|---|
| `query_system_data` (14 módulos) | ✅ | list/summary compactos |
| `mutate_system_data` — geral | ✅ | CREATE/UPDATE/DELETE c/ confirmação |
| `mutate_system_data` — **NUTRITION** | 🔧 | **Bug do usuário:** "anote minha janta" criava refeição com 0 kcal, sem macros e tipo errado. Agora o schema instrui a IA a SEMPRE estimar kcal pelas porções típicas, enviar `protein/carbs/fat` (novos campos persistidos no `Meal`) e mapear janta→DINNER etc. |
| `mutate_system_data` — **HEALTH peso** | 🔧 | Registrar peso pela IA criava snapshot com `height: 0, gender: "N/A"`, que virava o "mais recente" e **zerava a página Composição Corporal**. Agora faz carry-forward das medidas anteriores e espelha no `HealthMetric` (gráfico de evolução). |
| `analyze_system_data` (COMPARE/TREND/GROUP) | ✅ | agregações SQL em 1 chamada |
| `semantic_search` | ⚠️ | exige Ollama (nomic-embed-text) ou chave OpenAI; degrada com explicação |
| `find_correlations` | ✅ | padrões 90 dias |
| `project_future` | ✅ | EXPENSE/WEIGHT/WISHLIST |
| `weekly_retro` | ✅ | 7 dias vs 7 anteriores |
| `generate_flashcards` | ✅ | salva no deck da nota |
| `expert_council` | ✅ | 3 personas (3 chamadas) |
| `curate_media` / `game_master` | ✅ | dados reais do usuário |
| `audit_subscriptions` / `system_cleanup_scan` | ✅ | varreduras prontas |
| `explain_feature` | ✅ | manual vivo |
| `web_search` / `read_url` | ⚠️ | opt-in "Acesso à web" nas Configurações |
| `manage_memory` | ✅ | teto de 50 fatos |

## 2. Botões "Perguntar à IA" (AskAiButton)

Deep-link `/ai?q=` → composer chega preenchido e focado (page lê `searchParams.q`). ✅ em todos:
Finanças (dashboard), Lista de Desejos, Agenda, Timeline, Saúde (overview), Corpo, Academia, Sono, Nutrição.

## 3. Inbox Mágica (despejo rápido)

| Recurso | Status | Observação |
|---|---|---|
| Classificação IA + heurística local | ✅ | nada quebra sem IA |
| Item NUTRITION | 🔧 | mesma lacuna da janta: kcal só "se citado". Agora estima kcal + macros e mapeia o tipo da refeição. |

## 4. Recursos one-shot (fora do chat)

| Recurso | Onde | Status |
|---|---|---|
| Briefing diário | Dashboard | ✅ fallback local sem IA |
| Liquefação de tarefas | Dashboard | ✅ |
| Advogado do Diabo | Finanças (desejos) | ✅ fallback local |
| Classificação de extrato importado | Finanças → importar | ✅ fallback local |
| Resumo executivo de projeto | Projetos | ✅ |
| Automações de IA | Configurações | ✅ |
| **Carta de apresentação / Análise de match** | Vagas | 🔧 não decifrava chaves Anthropic/xAI/OpenRouter nem normalizava provider legado ("gemini") → falhava com erro críptico mesmo com o chat funcionando. Centralizado em `getAiCallConfig()` com mensagem amigável de configuração. |
| **Polir transcrição / Resumir reunião** | Projetos → Reuniões | 🔧 mesmos dois problemas das Vagas; corrigido com o mesmo helper. |
| Transcrição de reunião (gravação) | Projetos → Reuniões | ✅ `/api/transcribe` |

## 5. Padrão novo (para futuras features)

Qualquer action que chame a IA fora do chat deve usar
`getAiCallConfig(userId)` de `app/(dashboard)/ai/actions/oneshot.ts`:
resolve provider normalizado + modelo + **as 8 chaves** decifradas + erro amigável
(`setupMessage`) quando não configurado. Não duplicar o bloco `decryptKey(...)`.

## 6. Pergunte antes de chutar (clarify — 11/06/2026)

O chat agora **pergunta quando falta informação essencial** em vez de inventar ou registrar
pela metade (diretriz #10 do system prompt). O modelo encerra a resposta com o marcador
invisível `<!--ASK:[{"question":"...","options":[...]}]-->`; o servidor extrai
(`extractModelClarify` em `lib/ai-help.ts`), persiste como `<!--LIFEOS_CLARIFY:base64-->`
(mesma infra dos marcadores SUGGEST/ACTIONS) e a UI renderiza um **painel de respostas
ancorado acima do composer** (`ClarifyPanel` em `chat-interface.tsx`), estilo "pergunta
com opções" de assistente de código:

- **1 a 3 perguntas** no mesmo turno (ex.: valor E conta de uma vez), com progresso `1/2`.
- **2–4 opções por pergunta**, cada uma com `hint` opcional (subtexto de contexto).
- **Múltipla escolha** (`"multi": true`) com botão "Responder" que compõe a resposta.
- Pergunta única simples = **1 toque envia direto**; atalhos **Alt+1..4** no desktop.
- **"Outro… digitar resposta"** foca o composer; **X** ignora o painel.
- Resposta composta vai como `Pergunta resposta` por linha — formato que a diretriz manda
  o modelo aceitar e executar sem perguntar de novo.

Regras: só para dado essencial (valor, data, registro ambíguo...), nunca para o que dá
para estimar (ex.: kcal); quando há ASK os chips SUGGEST são suprimidos no turno; o painel
só aparece para a última resposta (e após o typewriter). Funciona no streaming SSE e no
fallback (ReactMarkdown não renderiza comentários HTML, então o marcador cru nunca aparece).

## 7. Cobertura total de módulos (11/06/2026 — tarde)

A IA passou de 14 para **20 módulos**, cobrindo todas as áreas do sistema:

| Módulo novo | O que faz | Limites de segurança |
|---|---|---|
| `JOBS` (Vagas) | funil completo: criar candidatura, mover de estágio (APPLIED→…→ACTIVE/REJECTED, com evento na timeline), follow-up, busca, resumo por status | — |
| `LINKS` (Links & Apps) | salvar/editar/buscar links (URL normalizada com https://), resumo por categoria | DELETE é **soft** (vai pra lixeira) |
| `NOTES` (Notas) | criar nota na Entrada, editar conteúdo, buscar por título/conteúdo/tags | editar conteúdo **guarda versão** no histórico; DELETE é soft |
| `TAGS` (Tags & Anexos) | criar/renomear/colorir/apagar tags, listar com contagem de usos | anti-duplicata (unique por nome) |
| `SITES` (Sites & CMS) | listar sites e nº de páginas | **somente leitura** (apiKey é sensível) |
| `SETTINGS` (Configurações) | resumo seguro (preferências, metas, flags de IA) + UPDATE com **safelist**: currency, theme, workStart/End, reminderLeadMinutes, sleepGoalHours, calorieGoalOverride, aiPersona, foodApiEnabled, autoLockMinutes | chaves de API, banco e segurança **nunca** — IA manda pra /settings |

O clarify (#6) funciona em todos: faltou empresa da vaga, URL do link, valor da meta → painel de pergunta.

### Travas anti-chute no servidor (clarify "de verdade")

Só instruir o modelo não bastou: testado com "registra um gasto de mercado", ele criou o
lançamento com **valor 0** e perguntou depois. Agora a camada de dados **recusa** criar
registro sem dado essencial e devolve no erro a ordem explícita de perguntar com ASK:

- `FINANCE CREATE` exige `value > 0` (nunca 0/inventado);
- `AGENDA CREATE` exige `date` com dia e hora (nunca "agora" por conta própria);
- `JOBS` já exigia empresa+cargo; `LINKS` exige URL; `SLEEP` exige horas.

Fluxo garantido: modelo tenta criar sem o dado → servidor recusa com instrução → modelo
abre o painel de pergunta → usuário responde → cria certo. A diretriz #10 também ganhou
a lista "NUNCA se chuta" + um exemplo concreto do fluxo. Exceção consciente: a Inbox
Mágica (captura rápida, sem conversa) mantém evento sem data = agora.

### Correção crítica de banco (timeout no chat)

`prisma.aiMessage.create` estourava `Timed out during query execution` (ConnectorError) no modo
local: o pool padrão do Prisma abre VÁRIAS conexões no mesmo arquivo SQLite e escrita concorrente
em HDD lento (G:\ 5400rpm) excede o busy timeout. Fix em `lib/prisma.ts`: URL local agora usa
`?connection_limit=1&socket_timeout=30&pool_timeout=30` (1 conexão = zero contenção interna) e a
assinatura do cliente virou `local:v2:` para descartar clientes antigos cacheados no globalThis.
**Reinicie o `npm run dev`** após atualizar.

## 8. Atalhos de navegação (GOTO — 11/06/2026)

A IA agora oferece **chips de navegação clicáveis** conforme o assunto da resposta
(diretriz #11): falou do funil de vagas → chip "Ver meu funil de vagas" → `/jobs`;
"onde configuro a IA?" → chip para `/settings?tab=intelligence`. Mecânica: o modelo
encerra com `<!--GOTO:[{"label":"...","href":"/rota"}]-->`; o servidor extrai
(`extractModelNav` em `lib/ai-help.ts`) e **valida o href contra uma whitelist** de
rotas internas (`NAV_PREFIXES` — o modelo nunca inventa destino; deep-link com query
é permitido). Persistido como `<!--LIFEOS_NAV:base64-->`, renderizado em qualquer
mensagem (o link continua válido no histórico), máx. 3 chips. Os cards de ação
(criou/editou → link) seguem existindo — o GOTO cobre o caso "só estou falando
daquela área", sem mutação.

## 9. Robustez do Gemini + medições corporais (11/06/2026 — noite)

- **"Sem resposta válida do Gemini."**: o Gemini às vezes devolve candidato VAZIO
  (finishReason MALFORMED_FUNCTION_CALL/SAFETY), principalmente após tool calls. Agora o
  loop **tenta 1x de novo** e, se persistir, devolve um fallback honesto: lista as ações
  que JÁ foram executadas (elas não se perdem) em vez do erro críptico. Log com o
  finishReason no console p/ diagnóstico.
- **Medições corporais gerenciáveis pelo chat**: `query HEALTH category=WEIGHT` lista os
  snapshots (id, data, peso, cintura) e o DELETE de HEALTH agora alcança `BodyMeasurement`
  (treino primeiro; se o id não for de treino, é medição). Era a lacuna que travou o
  pedido "exclui essas duas medições" — a IA não tinha como apagar.

## 10. Pendências futuras — ✅ TODAS ENTREGUES (11/06/2026 — noite)

- [x] **Botão "recalcular kcal com IA"** — `health/actions/nutrition-ai.ts`:
      banner âmbar no diário (Nutrição) quando há refeições com kcal vazia/0 →
      1 clique recalcula em LOTE (até 25 por rodada, 1 chamada de IA, macros
      existentes nunca sobrescritas). Bônus: botão "Estimar com IA" no form de
      refeição preenche kcal+macros pela descrição (revisa antes de salvar).
- [x] Editar macros manualmente na UI de Nutrição — **verificado: já existia**
      (campos P/C/G no form de refeição, opcionais em gramas).
- [x] `weekly_retro` automática aos domingos — **já entregue** via template de
      1 clique "🏁 Retro da semana (dom 20h)" nas Automações da IA (runner
      `lib/ai-automations.ts` roda o prompt com snapshot de contexto e notifica).
- [x] Backfill de snapshots corporais degenerados — `backfillBodySnapshots()`
      em `health/actions/body.ts`: herda altura/gênero/nascimento dos snapshots
      vizinhos reais (passada frente+trás); banner "Corrigir registros" na
      Composição Corporal aparece só quando existem degenerados.
