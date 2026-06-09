# 🗺️ Roadmap de Desenvolvimento — Life OS

> Plano de execução das ideias do [`SistemaIdeias.md`](./SistemaIdeias.md) (#1–#24).
> Ordenado por **dependência e valor**: o que destrava mais e reaproveita o que já existe vem primeiro.
> Marque `[x]` ao concluir. Cada fase é um marco entregável — não precisa fazer tudo de uma fase pra começar a próxima, mas a ordem reduz retrabalho.

**Esforço:** 🟢 P (pequeno, ~1 sessão) · 🟡 M (médio, alguns dias) · 🔴 G (grande, semana+ / mexe na fundação)

---

## 🧭 Princípios de execução
1. **Dados primeiro.** Quase toda a "inteligência" (Partes III–IV) precisa de um fluxo diário de dados (energia, sono, hábitos, taxa de poupança). Sem coleta, não há insight. Por isso a **Fase 0** é a captura.
2. **Incremental, nunca big-bang.** A Taxonomia PARA (#10) e o motor de dados entram como **campos/colunas aditivas**, módulo a módulo — sem refazer o banco de uma vez.
3. **Reaproveitar o que já existe.** Desafios (recém-turbinado), Agenda, Finanças, Saúde e Notas já são a base de 80% das ideias.
4. **Enviar pequeno e usar.** Cada item é uma feature utilizável sozinha. Validar no uso real antes de empilhar a próxima camada.

---

## 📊 Visão geral das fases

| Fase | Foco | Destrava | Esforço |
|------|------|----------|---------|
| **0. Fundação de Captura** | Energia, hábitos, fricção, captura rápida | Toda a inteligência (III/IV) | 🟡 |
| **1. Tática & Rotina** | Agenda em blocos, Pomodoro, Reset Semanal, rotinas | Uso diário, leveza | 🟡 |
| **2. Arquitetura** | Segundo Cérebro, 75/10/15, PARA leve, skill trees | Ativo cumulativo de longo prazo | 🔴 |
| **3. Inteligência** | Correlação, regulador adaptativo, preditivo, serendipidade | Insights / soberania | 🔴 |
| **4. Autonomia (co-piloto)** | Guardrails que agem por você | Anti-sabotagem, foco | 🔴 |

---

## 🧱 Fase 0 — Fundação de Captura *(a base de tudo)*

> Objetivo: criar o **fluxo de dados diário** que alimenta as fases 3 e 4. Tudo aqui é UI pequena com impacto enorme depois.

- [x] 🟢 **Check-in de Energia (1–5)** — micro-form de energia no topo da Home + mini-heatmap de 14 dias; 1 toque, upsert diário (data resolvida no cliente p/ não bugar fuso). **(#12)** ✅ *08/jun/2026*
  *Módulo:* Saúde/Dashboard · *Base p/:* #8, #13, #15, #23 · `EnergyCheckin` (modelo) · `energy-checkin-card.tsx`
- [x] 🟡 **Motor de Hábitos recorrentes** — hábitos diários com **streak**, check de hoje e **falha com motivo** (Sem tempo / Sem energia / Ambiente / Emergência) → captura a fricção do **#15**. Card na Home com criação (nome/emoji/cor). **(captura do #15, base do #3, #5, #11, #22)** ✅ *08/jun/2026*
  *Módulo:* Saúde · modelos `Habit` + `HabitLog` (dedicados — contínuos, ≠ Challenge finito) · `habits-card.tsx`
- [x] 🟢 **Captura rápida + Regra dos 2 min** — card "Caixa de entrada" na Home: capturar sem fricção, flag **"⚡ 2 min"** (seção "Faça agora") e concluir/descartar inline. Reaproveita o modelo `Task` (tarefa sem projeto = inbox) + coluna `twoMin`. **(#1)** ✅ *08/jun/2026*
  *Módulo:* Tarefas · `quick-capture.ts` · `quick-capture-card.tsx`

**Entregável da fase:** todo dia o sistema sabe sua energia, quais hábitos você cumpriu/falhou (e por quê) e tem uma caixa de entrada sem fricção.

> ## 🎉 FASE 0 CONCLUÍDA *(08/jun/2026)* — a fundação de captura está no ar. A partir daqui, as Fases 3–4 (inteligência/autonomia) já têm de onde tirar dados.

---

## ⏳ Fase 1 — Tática & Rotina *(leveza e execução diária)*

- [x] 🟡 **Time-Blocking + Pomodoro** — visão de calendário em **blocos** (início/fim configurável) com tarefas dentro e **timer de foco**. **(#1)** ✅ *jun/2026*
  *Módulo:* Agenda · `time-blocking-day.tsx` + `FocusSession`/`FocusDock` (módulo Foco) + lembrete de blocos configurável
- [x] 🟢 **Dias Temáticos** — tema/cor por dia da semana; ao abrir o dia, "Hoje é dia de [tema]" + filtro das tarefas daquela área. **(#1)** ✅ *jun/2026*
  *Módulo:* Agenda · modelo `ThemedDay` + `themed-days.tsx` (aparece na grade de blocos e no planner)
- [x] 🟡 **Ritual de Reset Semanal** — fluxo guiado de domingo (revisar pendências, planejar a semana, limpar inbox) que já mostra o **gráfico de fricção** coletado na Fase 0. **(#1 + #15)** ✅ *jun/2026*
  *Módulo:* Home · `weekly-reset-card.tsx`
- [x] 🟢 **Método Alastrar** — visão semanal estilo planner (dias × tarefas, riscar ao concluir). **(#1)** ✅ *09/jun/2026*
  *Módulo:* Agenda · aba **Planner** · `week-planner.tsx` (riscar otimista + adição rápida por dia + cor do Dia Temático)
- [x] 🟡 **Rotina Matinal configurável** — sequência de hábitos encadeados com horário (água, respiração, flexões, etc.), ligada à Saúde e ao Pomodoro. **(#5, #11)** ✅ *jun/2026*
  *Módulo:* Agenda · aba Rotina · `RoutineItem` + `routine-manager.tsx` (blocos fixos por dia/categoria)
- [x] 🟢 **Limpeza Programada** — tarefas recorrentes por cômodo/dia em rodízio (vira hábito). **(#3)** ✅ *09/jun/2026*
  *Módulo:* Agenda · botão **Limpeza** na Rotina · `cleaning-rotation-dialog.tsx` + `seedCleaningRotation` (round-robin de cômodos → blocos fixos)

**Entregável:** o dia a dia roda em blocos focados, com rituais que previnem o caos.

> ## 🎉 FASE 1 CONCLUÍDA *(09/jun/2026)* — o dia a dia roda em blocos, planner semanal, rotina fixa e rodízio de limpeza.

---

## 🏛️ Fase 2 — Arquitetura *(estrutura de longo prazo)*

- [x] 🔴 **Segundo Cérebro reforçado** — captura sem fricção, **diário**, e início do **grafo de conexões** (reusa o "tecido conectivo"/EntityConnections existente). **(#2)** ✅ *09/jun/2026*
  *Módulo:* Notas/Estudos · **Diário**: caderno auto-criado + nota-por-dia com template e streak 🔥 (`journal-actions.ts`, botão no header de Notas) · **Grafo**: `/notes/graph` força-dirigido (`note-graph.tsx`) com arestas de menções `/notes/{id}` + EntityLink · captura sem fricção já existia (`quickCaptureNote`)
- [x] 🟡 **Notas Atômicas + Mapas de Conteúdo** — incentivar título descritivo (1 ideia/nota) e notas-sumário que agrupam atômicas de um hiperfoco. **(#9)** ✅ *09/jun/2026*
  *Módulo:* Notas · nudge de atomicidade no editor (`lib/note-atomicity.ts`, heurística local; Diário/Mapas isentos) + **Mapa de Conteúdo** gerado por tema (tag/matéria com 2+ notas) via diálogo no header (`map-actions.ts`); o mapa nasce favorito e regenera em 1 clique
- [x] 🟡 **Orçamento 75/10/15** — baldes percentuais (fixas / prazeres / investimentos+reserva) calculados da renda; visão de quanto resta em cada um. **(#9 finanças)** ✅ *09/jun/2026*
  *Módulo:* Finanças · `lib/budget-buckets.ts` + `budget-section.tsx` (classificação por heurística de categoria; custo fixo pago = Essencial)
- [x] 🟢 **Contas recorrentes / automação** — cadastro de contas fixas com lembrete e marca "débito automático". **(#10 finanças)** ✅ *jun/2026*
  *Módulo:* Finanças · `RecurringExpense` (+pagamentos por ocorrência) + lembretes `BILL_DUE` no sino
- [x] 🔴 **Taxonomia PARA (leve)** — campo `paraType` (Projeto/Área/Recurso/Arquivo) **aditivo** nos modelos, com filtro/busca global. *Decisão estratégica: introduzir cedo, mas incremental.* **(#10)** ✅ *09/jun/2026*
  *Base p/:* #23 · migration `20260609120000_para_taxonomy` (Project/Notebook/SavedLink) + `lib/para.ts` + UI em Projetos (seletor na criação, badge 1-clique no card, filtro na toolbar). *Estender a UI p/ Notas/Links é incremental.*
- [x] 🟡 **Gamificação Espacial + Skill Trees (base)** — metas grandes viram "jornada" visual com etapas; hábitos-raiz que desbloqueiam multiplicadores. Evolui Desafios + Motor de Hábitos. **(#11, #22)** ✅ *base em 08/jun/2026*
  *Skill Trees entregue (hábitos que evoluem de nível — Saúde). A "jornada espacial" visual de metas grandes fica como evolução futura.*

**Entregável:** conhecimento, dinheiro e corpo passam a acumular valor com estrutura comum e busca global.

> ## 🎉 FASE 2 CONCLUÍDA *(09/jun/2026)* — diário, grafo, notas atômicas, mapas, PARA, 75/10/15 e skill trees no ar.

---

## 🧠 Fase 3 — Inteligência *(insights / soberania)*

> Só faz sentido depois que as Fases 0–2 estão gerando dados.

- [x] 🔴 **Motor de Correlação** — "Correlation Dashboard" cruzando sono × treino (RIR/carga) × energia × diário; gera frases-insight automáticas. **(#8)** ✅ *09/jun/2026*
  *Depende de:* #12, Saúde, diário · `getCorrelationMatrix` (focus-actions) + `correlation-dashboard.tsx` na Saúde: série diária sobreposta (sono × treino × energia × foco) + TODOS os padrões fortes; o "Insight do dia" (Home) segue como resumo nº 1
- [x] 🟡 **Regulador Adaptativo de Carga** — energia 1–2 → encurta blocos (50→25min) + treino conservador; energia 5 → "Modo Deus" pro Hiperfoco. **(#13)** ✅ *jun/2026*
  *Módulo:* Home · `daily-regulator-card.tsx`
- [x] 🟡 **Finanças Preditivas + Custo de Hesitação** — linha de tendência pela taxa de poupança → mês/ano da meta; gasto supérfluo mostra o "custo no Eu do Futuro". **(#16)** ✅ *09/jun/2026*
  *Módulo:* Finanças · `budget-section.tsx` ("No ritmo atual"): poupança média/mês, taxa de poupança, acúmulo em 12 meses e **mês/ano projetado de cada meta da wishlist**
- [x] 🟡 **Serendipidade Ativa** — ao escrever sobre um tema, rodapé com "notas antigas que se conectam". **(#14)** ✅ *09/jun/2026*
  *Módulo:* Notas · `lib/note-serendipity.ts` + card "Conexões esquecidas" no editor (tags/assunto/vocabulário em comum; exclui notas já linkadas)
- [x] 🟢 **Painel do Vetor de Fricção** — gráfico do "maior inimigo da consistência" (a captura já vem da Fase 0). **(#15)** ✅ *jun/2026*
  *Módulo:* Home · `friction-vector-card.tsx`

**Entregável:** o sistema começa a te dizer verdades que você não veria sozinho.

> ## 🎉 FASE 3 CONCLUÍDA *(09/jun/2026)* — correlações, regulador, preditivas, serendipidade e fricção no ar.

---

## 🤖 Fase 4 — Autonomia (co-piloto) *(o sistema age por você)*

> Camada mais ambiciosa: depende de quase tudo acima. Vários itens usam **IA** (já temos o Cérebro Digital) e alguns exigem **integração externa**.

- [x] 🟡 **Custo Fantasma da Inércia** — contador no painel: treino pulado sem motivo biológico → atraso projetado; dinheiro parado → perda/hora pra inflação. **(#20)** ✅ *09/jun/2026*
  *Depende de:* #15, Investimentos · `inertia-cost-card.tsx` na Home: dias sem treino vs ritmo próprio (treinos "devidos") + saldo parado × inflação (perda/ano e /dia); some sem alerta
- [x] 🟡 **Digital Rot** — tarefas/notas não tocadas perdem opacidade e se autoarquivam (Limpeza Fantasma). **(#21)** ✅ *09/jun/2026*
  *Módulo:* Home · `digital-rot-actions.ts` + `digital-rot-card.tsx`: tarefa >45d / nota >90d sem toque desbota com a idade; reviver (zera relógio) ou arquivar (Lixeira, reversível) + botão "Limpeza Fantasma" (tudo de uma vez); pinada/favorita nunca apodrece
- [x] 🔴 **Advogado do Diabo (IA)** — ao tentar adiar meta/estourar balde, resgata seus argumentos passados pra confrontar a desculpa atual. **(#17)** ✅ *09/jun/2026*
  *Depende de:* histórico de Notas/Metas + IA · botão no balde estourado do 75/10/15 → confronto com as SUAS metas da wishlist + trechos das suas notas (`devils-advocate-actions.ts`); IA one-shot (`ai/actions/oneshot.ts`) com fallback determinístico sem IA
- [x] 🔴 **Liquefação de Tarefas** — bloco vencido 2× → divide a tarefa em micro-passos automaticamente. **(#18)** ✅ *09/jun/2026*
  *Depende de:* Time-Blocking + 2min · card "Tarefas congeladas" na Home (`liquefy-card.tsx` + `liquefy-actions.ts`): 2+ blocos vencidos → IA divide em 3–5 micro-passos (fallback padrão sem IA); o 1º vira ⚡ 2 min na Caixa de Entrada
- [x] 🟡 **Orçamento de Carga Cognitiva** — "peso de decisão" por interação → Modo de Preservação (simplifica a UI quando você está exausto). **(#19)** ✅ *09/jun/2026*
  *Módulo:* Home · `preservation-gate.tsx`: energia 1–2 no check-in → painéis de análise escondidos (fica o essencial: energia, hábitos, captura, regulador); opt-out por dia (localStorage). *Peso por interação fica como evolução futura.*
- [x] 🟡 **Radar de Pontos Cegos** — audita densidade de dados por PARA; alerta quando uma área (Descanso/Lazer) é negligenciada. **(#23)** ✅ *09/jun/2026*
  *Depende de:* #10 PARA · `blind-spot-radar.tsx` na Home: densidade de registros em 7 áreas de vida (Corpo/Descanso/Mente/Lazer/Social/Finanças/Projetos) nos últimos 14 dias; barra por área + alerta "ponto cego" nas zeradas
- [x] 🔴 **Balanço Dopaminérgico** — cataloga dopamina barata × conquistada; via integração **AppBlock/Screen Time** recalibra a agenda. **(#24)** ✅ *experimento em 09/jun/2026*
  *Risco:* integração externa (web não acessa Screen Time facilmente) → **entregue como experimento** com dados internos: `dopamine-balance-card.tsx` na Saúde — conquistada (foco/treino/estudo/hábitos) × barata em proxy (mídia consumida + compras de impulso do balde Prazeres). *Integração Screen Time segue como evolução futura.*

**Entregável:** o Life OS vira co-piloto: protege sua atenção e desarma a autossabotagem.

> ## 🏁 FASE 4 CONCLUÍDA *(09/jun/2026)* — **ROADMAP COMPLETO**: as 24 ideias do SistemaIdeias.md têm entrega no ar (as marcadas como "evolução futura" são refinamentos, não lacunas).

---

## 🚀 Começar agora (primeiro sprint sugerido)

A ordem que dá mais resultado com menos esforço, reaproveitando o que acabamos de mexer (Desafios/Saúde):

1. **Check-in de Energia (1–5)** — 🟢 a peça-chave que destrava a inteligência depois.
2. **Motor de Hábitos + falha com motivo** — 🟡 evolui o Desafios que já está pronto.
3. **Captura rápida + Regra dos 2 min** — 🟢 alívio imediato no dia a dia.

> Com esses três, a Fase 0 fecha e já começamos a acumular os dados que tornam as Fases 3–4 possíveis.

---

## ✅ Cobertura — onde cada ideia entra

| Ideia | Fase |
|-------|------|
| #1 Dias temáticos · time-blocking · 2min · reset · alastrar · pomodoro | 0 (2min/captura) · 1 |
| #2 Segundo Cérebro | 2 |
| #3 Casa · limpeza programada · organização invisível | 0 (hábitos) · 1 |
| #4 Finanças: consumo consciente · 75/10/15 · automação · investimentos | 2 |
| #5 Manhã reguladora / rotina matinal | 1 |
| #6 Hiperfoco | 2 (Mapas de Conteúdo) · alimenta #13/#17 |
| #7 Referências (Notion/Hevy/AppBlock/Apple Fitness) | 4 (integrações) |
| #8 Motor de Correlação | 3 |
| #9 Notas Atômicas/Zettelkasten | 2 |
| #10 Taxonomia PARA | 2 |
| #11 Gamificação Espacial | 2 |
| #12 Check-ins Metacognitivos | **0** |
| #13 Regulador Adaptativo | 3 |
| #14 Serendipidade Ativa | 3 |
| #15 Vetor de Fricção | 0 (captura) · 3 (painel) |
| #16 Finanças Preditivas | 3 |
| #17 Advogado do Diabo | 4 |
| #18 Liquefação de Tarefas | 4 |
| #19 Carga Cognitiva | 4 |
| #20 Custo da Inércia | 4 |
| #21 Digital Rot | 4 |
| #22 Skill Trees | 2 |
| #23 Radar de Pontos Cegos | 4 |
| #24 Balanço Dopaminérgico | 4 (experimento) |

---

## 📝 Log de progresso
> Registre aqui o que foi concluído (data + item) conforme avançamos.

- **08/jun/2026** — ✅ Fase 0 · **Check-in de Energia (#12)**: modelo `EnergyCheckin`, actions (`saveEnergyCheckin`/`getEnergyCheckins`), card 1–5 + mini-heatmap no topo da Home. Aplicado em local + Turso + réplica.
- **08/jun/2026** — ✅ Fase 0 · **Motor de Hábitos (#15 captura)**: modelos `Habit`/`HabitLog`, actions (`createHabit`/`deleteHabit`/`setHabitLog`/`getHabits`), card de hábitos diários (streak + check + falha-com-motivo) na Home.
- **08/jun/2026** — ✅ Fase 0 · **Captura Rápida + 2 min (#1)**: coluna `Task.twoMin`, actions de inbox (`quickCaptureTask`/`getInboxTasks`/`completeInboxTask`/`deleteInboxTask`), card "Caixa de entrada" na Home. **🎉 FASE 0 COMPLETA** (energia + hábitos + inbox = fundação de dados pronta).
- **08/jun/2026** — ✅ Fase 1/3 (em commits anteriores, registrado agora): Time-Blocking + lembrete de blocos, Dias Temáticos, módulo Foco (Pomodoro + FocusDock), Reset Semanal, Skill Trees (#22), Regulador Adaptativo (#13), Vetor de Fricção (#15), Insight do dia (núcleo do #8).
- **09/jun/2026** — ✅ Fase 1 · **Método Alastrar (#1)**: aba **Planner** na Agenda (`week-planner.tsx`) — semana como planner de papel, riscar otimista, adição rápida por dia, cor do Dia Temático. **🎉 FASE 1 COMPLETA**.
- **09/jun/2026** — ✅ Fase 1 · **Limpeza Programada (#3)**: `seedCleaningRotation` + diálogo de rodízio (cômodos × dias, round-robin) criando blocos fixos na Rotina.
- **09/jun/2026** — ✅ Fase 2 · **Orçamento 75/10/15 (#9)**: `lib/budget-buckets.ts` (classificação por heurística de categoria + origem fixa) + seção no dashboard de Finanças com baldes e estouro.
- **09/jun/2026** — ✅ Fase 3 · **Finanças Preditivas (#16)**: projeção pela taxa de poupança (média/mês, 12 meses, mês/ano de cada meta da wishlist) no card "No ritmo atual".
- **09/jun/2026** — ✅ Fase 2 · **Taxonomia PARA (#10)**: migration `20260609120000_para_taxonomy` (coluna `paraType` em Project/Notebook/SavedLink) + `lib/para.ts` + UI em Projetos (seletor no diálogo de criação, badge 1-clique no card, filtro PARA na toolbar). Baseline regenerado.
- **09/jun/2026** — ✅ Fase 3 · **Serendipidade Ativa (#14)**: `lib/note-serendipity.ts` + card "Conexões esquecidas" no editor de notas (tags/assunto/vocabulário; ignora notas já linkadas).
- **09/jun/2026** — ✅ Fase 3 · **Motor de Correlação completo (#8)**: `getCorrelationMatrix` em `focus-actions.ts` + `correlation-dashboard.tsx` na página de Saúde — série diária (sono × treino × energia × foco) + lista de todos os padrões fortes. **🎉 FASE 3 COMPLETA**.
- **09/jun/2026** — ✅ Fase 4 · **Custo Fantasma da Inércia (#20)**: `inertia-cost-card.tsx` na Home — dias sem treino vs ritmo recente do próprio usuário (treinos "devidos") + dinheiro parado × inflação (perda/ano e /dia). Some quando não há alerta.
- **09/jun/2026** — ✅ Fase 4 · **Radar de Pontos Cegos (#23)**: `blind-spot-radar.tsx` na Home — densidade de registros em 7 áreas de vida (14 dias) com barras e alerta de "ponto cego" nas áreas zeradas.
- **09/jun/2026** — ✅ Fase 4 · **Digital Rot / Limpeza Fantasma (#21)**: `digital-rot-actions.ts` + `digital-rot-card.tsx` na Home — tarefa >45d / nota >90d sem toque desbota com a idade; reviver ou arquivar (Lixeira, reversível), botão "Limpeza Fantasma" arquiva tudo; pinada/favorita nunca apodrece.

- **09/jun/2026** — ✅ Fase 2 · **Segundo Cérebro (#2)**: Diário (caderno auto-criado, nota-por-dia com template, streak 🔥) + **Grafo de Conexões** em `/notes/graph` (força-dirigido; arestas = menções no texto + EntityLink). **🎉 FASE 2 COMPLETA**.
- **09/jun/2026** — ✅ Fase 2 · **Notas Atômicas + Mapas de Conteúdo (#9)**: nudge de atomicidade no editor (`lib/note-atomicity.ts`) + geração/regeneração de Mapa de Conteúdo por tag/matéria (diálogo no header de Notas).
- **09/jun/2026** — ✅ Fase 4 · **Advogado do Diabo (#17)**: balde estourado no 75/10/15 → confronto com as metas/notas do próprio usuário; IA one-shot reutilizável (`ai/actions/oneshot.ts`) com fallback local determinístico.
- **09/jun/2026** — ✅ Fase 4 · **Liquefação de Tarefas (#18)**: card "Tarefas congeladas" na Home detecta 2+ blocos vencidos e derrete a tarefa em micro-passos (IA ou padrão); 1º passo entra como ⚡ 2 min.
- **09/jun/2026** — ✅ Fase 4 · **Modo de Preservação (#19)**: energia ≤2 → Home esconde painéis pesados (essencial fica), opt-out diário via localStorage (`preservation-gate.tsx`).
- **09/jun/2026** — ✅ Fase 4 · **Balanço Dopaminérgico (#24, experimento)**: card na Saúde comparando dopamina conquistada × barata (proxy com dados internos). **🏁 FASE 4 COMPLETA — ROADMAP COMPLETO.**

### 🔭 Evoluções futuras (refinamentos, não lacunas)
- Jornada espacial visual de metas grandes (#11) · UI do PARA em Notas/Links (#10) · "peso de decisão" por interação (#19) · integração Screen Time/AppBlock no Balanço Dopaminérgico (#24).
