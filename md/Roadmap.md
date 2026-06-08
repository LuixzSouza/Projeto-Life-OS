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
- [ ] 🟡 **Motor de Hábitos recorrentes** — hábitos diários/semanais com streak (evolui o módulo de **Desafios**). Inclui marcar **falha ("X vermelho") com motivo** (Falta de tempo / Baixa energia / Ambiente / Emergência). **(captura do #15, base do #3, #5, #11, #22)**
  *Módulo:* Saúde/Desafios
- [ ] 🟢 **Captura rápida + Regra dos 2 min** — botão global de "jogar tarefa/ideia" numa Inbox, com flag **"faça agora (2 min)"** e um modo que junta as micro-tarefas. **(#1)**
  *Módulo:* Agenda/Tarefas

**Entregável da fase:** todo dia o sistema sabe sua energia, quais hábitos você cumpriu/falhou (e por quê) e tem uma caixa de entrada sem fricção.

---

## ⏳ Fase 1 — Tática & Rotina *(leveza e execução diária)*

- [ ] 🟡 **Time-Blocking + Pomodoro** — visão de calendário em **blocos** (início/fim configurável) com tarefas dentro e **timer de foco**. **(#1)**
  *Módulo:* Agenda
- [ ] 🟢 **Dias Temáticos** — tema/cor por dia da semana; ao abrir o dia, "Hoje é dia de [tema]" + filtro das tarefas daquela área. **(#1)**
  *Módulo:* Agenda
- [ ] 🟡 **Ritual de Reset Semanal** — fluxo guiado de domingo (revisar pendências, planejar a semana, limpar inbox) que já mostra o **gráfico de fricção** coletado na Fase 0. **(#1 + #15)**
  *Módulo:* Agenda/Dashboard
- [ ] 🟢 **Método Alastrar** — visão semanal estilo planner (dias × tarefas, riscar ao concluir). **(#1)**
- [ ] 🟡 **Rotina Matinal configurável** — sequência de hábitos encadeados com horário (água, respiração, flexões, etc.), ligada à Saúde e ao Pomodoro. **(#5, #11)**
- [ ] 🟢 **Limpeza Programada** — tarefas recorrentes por cômodo/dia em rodízio (vira hábito). **(#3)**

**Entregável:** o dia a dia roda em blocos focados, com rituais que previnem o caos.

---

## 🏛️ Fase 2 — Arquitetura *(estrutura de longo prazo)*

- [ ] 🔴 **Segundo Cérebro reforçado** — captura sem fricção, **diário**, e início do **grafo de conexões** (reusa o "tecido conectivo"/EntityConnections existente). **(#2)**
  *Módulo:* Notas/Estudos
- [ ] 🟡 **Notas Atômicas + Mapas de Conteúdo** — incentivar título descritivo (1 ideia/nota) e notas-sumário que agrupam atômicas de um hiperfoco. **(#9)**
- [ ] 🟡 **Orçamento 75/10/15** — baldes percentuais (fixas / prazeres / investimentos+reserva) calculados da renda; visão de quanto resta em cada um. **(#9 finanças)**
  *Módulo:* Finanças · *Base p/:* #16, #20
- [ ] 🟢 **Contas recorrentes / automação** — cadastro de contas fixas com lembrete e marca "débito automático". **(#10 finanças)**
- [ ] 🔴 **Taxonomia PARA (leve)** — campo `paraType` (Projeto/Área/Recurso/Arquivo) **aditivo** nos modelos, com filtro/busca global. *Decisão estratégica: introduzir cedo, mas incremental.* **(#10)**
  *Base p/:* #23
- [ ] 🟡 **Gamificação Espacial + Skill Trees (base)** — metas grandes viram "jornada" visual com etapas; hábitos-raiz que desbloqueiam multiplicadores. Evolui Desafios + Motor de Hábitos. **(#11, #22)**

**Entregável:** conhecimento, dinheiro e corpo passam a acumular valor com estrutura comum e busca global.

---

## 🧠 Fase 3 — Inteligência *(insights / soberania)*

> Só faz sentido depois que as Fases 0–2 estão gerando dados.

- [ ] 🔴 **Motor de Correlação** — "Correlation Dashboard" cruzando sono × treino (RIR/carga) × energia × diário; gera frases-insight automáticas. **(#8)**
  *Depende de:* #12, Saúde, diário
- [ ] 🟡 **Regulador Adaptativo de Carga** — energia 1–2 → encurta blocos (50→25min) + treino conservador; energia 5 → "Modo Deus" pro Hiperfoco. **(#13)**
  *Depende de:* #12, Time-Blocking, Sessão ao Vivo
- [ ] 🟡 **Finanças Preditivas + Custo de Hesitação** — linha de tendência pela taxa de poupança → mês/ano da meta; gasto supérfluo mostra o "custo no Eu do Futuro". **(#16)**
  *Depende de:* 75/10/15
- [ ] 🟡 **Serendipidade Ativa** — ao escrever sobre um tema, rodapé com "notas antigas que se conectam". **(#14)**
  *Depende de:* Segundo Cérebro + tags
- [ ] 🟢 **Painel do Vetor de Fricção** — gráfico do "maior inimigo da consistência" (a captura já vem da Fase 0). **(#15)**

**Entregável:** o sistema começa a te dizer verdades que você não veria sozinho.

---

## 🤖 Fase 4 — Autonomia (co-piloto) *(o sistema age por você)*

> Camada mais ambiciosa: depende de quase tudo acima. Vários itens usam **IA** (já temos o Cérebro Digital) e alguns exigem **integração externa**.

- [ ] 🟡 **Custo Fantasma da Inércia** — contador no painel: treino pulado sem motivo biológico → atraso projetado; dinheiro parado → perda/hora pra inflação. **(#20)**
  *Depende de:* #15, Investimentos
- [ ] 🟡 **Digital Rot** — tarefas/notas não tocadas perdem opacidade e se autoarquivam (Limpeza Fantasma). **(#21)**
- [ ] 🔴 **Advogado do Diabo (IA)** — ao tentar adiar meta/estourar balde, resgata seus argumentos passados pra confrontar a desculpa atual. **(#17)**
  *Depende de:* histórico de Notas/Metas + IA
- [ ] 🔴 **Liquefação de Tarefas** — bloco vencido 2× → divide a tarefa em micro-passos automaticamente. **(#18)**
  *Depende de:* Time-Blocking + 2min
- [ ] 🟡 **Orçamento de Carga Cognitiva** — "peso de decisão" por interação → Modo de Preservação (simplifica a UI quando você está exausto). **(#19)**
- [ ] 🟡 **Radar de Pontos Cegos** — audita densidade de dados por PARA; alerta quando uma área (Descanso/Lazer) é negligenciada. **(#23)**
  *Depende de:* #10 PARA
- [ ] 🔴 **Balanço Dopaminérgico** — cataloga dopamina barata × conquistada; via integração **AppBlock/Screen Time** recalibra a agenda. **(#24)**
  *Risco:* integração externa (web não acessa Screen Time facilmente) → **deixar por último / como experimento**.

**Entregável:** o Life OS vira co-piloto: protege sua atenção e desarma a autossabotagem.

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
