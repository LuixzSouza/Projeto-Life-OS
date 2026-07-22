# 📚 Módulo Estudos — Roadmap "Tudo em 1"

> **Objetivo:** transformar o módulo de Estudos do Life OS no melhor app de estudos
> **all-in-one** do mercado — pegando o que cada gigante faz de bom (e corrigindo o
> que fazem de ruim), sem nunca perder a filosofia do projeto: **privacy-first,
> local-capable, frictionless e premium**. Um único lugar para capturar, aprender,
> memorizar, focar, planejar e se preparar (ENEM/vestibular/idiomas/faculdade).

Data: 2026-07-21 · Autor: Life OS AI + Luiz

---

## 1. Filosofia do módulo

1. **Um só app, não dez.** O aluno não deveria pular entre Notion (notas), Anki
   (revisão), Forest (foco), Google Agenda (cronograma) e Passei Direto (material).
   Tudo conversa: uma nota vira flashcard, um flashcard puxa a matéria, a matéria
   entra no plano do dia, a sessão de foco alimenta a ofensiva.
2. **Ciência do aprendizado no centro.** As técnicas comprovadas (revisão
   espaçada, recordação ativa, intercalação, Feynman, elaboração) não são um
   "recurso" — são o esqueleto do módulo.
3. **Zero fricção pra começar.** Um clique entra no foco. Capturar uma dúvida,
   um card ou uma nota tem que ser instantâneo.
4. **Motivação sustentável.** Gamificar sem vício tóxico: constância > intensidade,
   ofensivas honestas, sem "pay-to-win" nem ansiedade de streak (opção de "streak
   freeze" à la Duolingo).

---

## 2. O que JÁ temos hoje (inventário real do código)

| Área | Já existe | Onde |
| --- | --- | --- |
| Matérias com hierarquia, meta de horas, dificuldade, status | ✅ | `StudySubject` |
| Conteúdos tipados (vídeo/livro/artigo) com progresso | ✅ (modelo) | `StudyContent` / `ContentType` |
| Sessões de estudo + nível de foco | ✅ | `StudySession` |
| Timer de foco (Pomodoro) + FocusSession global (dock) | ✅ | `study-timer.tsx`, `components/focus/*` |
| Notas ricas: cadernos, versões, imagens base64, PARA, tags, favoritos | ✅ | `StudyNote`, `Notebook`, `StudyNoteVersion` |
| Nota → flashcards + "Perguntar à IA" no editor | ✅ | [[notes-editor-features]], [[goals-module]] |
| Flashcards com SRS (SM-2: box, easeFactor, interval, nextReview) | ✅ | `Flashcard`, `lib/srs.ts` [[srs-engine]] |
| Baralhos: Leitner, público/shareCode, gerador por IA, imagem, áudio (speak) | ✅ | `components/flashcards/*` |
| Revisão do dia (cartões vencidos) em 1 clique | ✅ | `daily-review-banner.tsx` |
| Metas de aprendizado + tarefas | ✅ | `LearningGoal`, `LearningTask` |
| Gamificação: ELO com decaimento, XP, heatmap de constância, analytics | ✅ | `studies-elo.ts`, `study-heatmap.tsx` |
| Plano do dia (matérias abaixo da meta, mais esquecidas primeiro) | ✅ | `study-plan-card.tsx` |
| Agenda unificada (sessões datadas aparecem no calendário) | ✅ | [[agenda-aggregator]] |

**Conclusão:** a base é forte. O que falta é a camada "app de estudos de verdade":
ambiente de foco imersivo, modos de estudo variados (Quizlet), trilhas guiadas,
preparação de provas (ENEM), banco de questões/simulados, tutor de IA mais ativo,
e o polimento de motivação (Duolingo/Forest).

---

## 3. O que roubar de cada app (o bom e o ruim)

### 🟩 Notion — *organização flexível*
- **Bom:** hierarquia livre, tudo linkável, templates, databases com views.
- **Ruim:** curva de aprendizado alta, lento, "página em branco" trava o aluno.
- **Pra cá:** manter as notas/cadernos (temos), mas com **templates prontos**
  (Cornell, Feynman, resumo de aula, mapa mental) e captura instantânea. Nada de
  página em branco intimidante — sempre um ponto de partida.

### 🟩 Forest — *foco por compromisso*
- **Bom:** plantar uma árvore que "morre" se você sair — compromisso emocional;
  floresta acumulada = histórico visual bonito.
- **Ruim:** punição pode gerar culpa; fechado no celular.
- **Pra cá:** modo foco com **"árvore/planta" que cresce durante a sessão** e entra
  numa **floresta/jardim de constância** (reusar o heatmap como jardim). Sem punição
  tóxica: sessão interrompida vira "muda" pequena, não morte.

### 🟩 Google Keep — *captura relâmpago*
- **Bom:** anotar em 1 toque, cores, checklists, notas de voz, imagem.
- **Ruim:** desorganiza em escala, sem hierarquia.
- **Pra cá:** **captura rápida** (a Inbox/Entrada já existe) com voz→texto,
  foto→OCR, e "colar e organizar depois". Widget de captura global (Ctrl+K).

### 🟩 Duolingo — *hábito e gamificação*
- **Bom:** ofensiva (streak), XP, ligas, lições curtas ("bite-sized"), lembretes
  espertos, "coração"/vidas, streak freeze.
- **Ruim:** pode virar "farm de XP" sem aprendizado real; ansiedade de streak.
- **Pra cá:** já temos ELO/XP/heatmap. Adicionar **metas diárias ajustáveis**,
  **streak freeze** (1-2 por mês), **lembrete inteligente** (notificação no melhor
  horário), e **micro-lições** (sessões de 5-10 min sugeridas).

### 🟩 Quizlet — *modos de estudo de flashcards*
- **Bom:** um baralho, vários modos — **Cards, Aprender (adaptativo), Escrever,
  Soletrar, Teste, Combinar (jogo), Blocos**.
- **Ruim:** paywall agressivo nos modos bons.
- **Pra cá:** temos SRS + estudo básico. Adicionar **modos**: Combinar (match game),
  Escrever (digitar a resposta), Teste (múltipla escolha gerada), e Verdadeiro/Falso.
  Tudo grátis, client-side quando possível.

### 🟩 Trello — *plano visual (Kanban)*
- **Bom:** quadro Kanban simples (A fazer / Fazendo / Feito), arrastar cartões.
- **Ruim:** genérico demais, não é feito pra estudo.
- **Pra cá:** um **quadro de estudo** por objetivo/prova: colunas "Para estudar /
  Estudando / Revisar / Dominado" com matérias/tópicos como cartões. As
  `LearningGoal`/`LearningTask` já dão a base.

### 🟩 AppBlock — *anti-distração*
- **Bom:** bloquear apps/sites durante o foco.
- **Ruim:** fácil de burlar; agressivo.
- **Pra cá (web):** **modo foco imersivo** que ocupa a tela, esconde notificações
  do próprio Life OS, mostra só o timer + som ambiente, e um "checkpoint" se você
  tentar sair. Não dá pra bloquear o SO pelo navegador, mas dá pra remover TODA
  fricção/distração dentro do app.

### 🟩 Khan Academy — *aprendizado estruturado e domínio*
- **Bom:** trilhas por tópico, "mastery" (domínio) por habilidade, exercícios
  com dicas passo a passo, vídeos + prática.
- **Ruim:** conteúdo próprio (não dá pra replicar o acervo).
- **Pra cá:** **trilhas de domínio** por matéria — o aluno (ou a IA) define os
  tópicos, e cada um tem barra de domínio que sobe com sessões + acertos em cards.
  Reusar `StudyContent` (progresso) + nível de domínio calculado.

### 🟩 Pomodoro Timer — *técnica de foco*
- **Bom:** ciclos 25/5, pausas longas, simples.
- **Pra cá:** já temos. Adicionar **presets** (25/5, 50/10, 90-min ultradiano,
  52/17) e **ciclos automáticos** com registro de quantos pomodoros/dia.

### 🟩 GoodNotes — *escrita à mão / anotação livre*
- **Bom:** escrever à mão, marcar PDFs, canvas infinito.
- **Ruim:** precisa de caneta/tablet.
- **Pra cá:** um **canvas de rascunho** simples (desenhar com mouse/dedo/caneta)
  anexável a uma nota — pra fazer contas, diagramas, mapas mentais rápidos. Salvo
  como imagem base64 (já temos `NoteImage`). Opcional/leve.

### 🟩 Spotify — *ambiente sonoro*
- **Bom:** playlists de foco, lofi, ruído branco/marrom, sons da natureza.
- **Pra cá:** **mixer de sons ambiente** gerado no próprio navegador (Web Audio:
  ruído branco/rosa/marrom, chuva, ondas, vento) — offline, privacy-first, sem
  depender de streaming externo. Integrado ao modo foco.

### 🟩 Passei Direto — *material e prova de faculdade*
- **Bom:** materiais compartilhados, resumos, provas antigas por disciplina.
- **Ruim:** paywall, qualidade variável, é "cola".
- **Pra cá:** **biblioteca de materiais** por matéria (PDFs/links/resumos —
  `StudyContent` já suporta), com resumo por IA. Foco em ORGANIZAR o material do
  próprio aluno, não pirataria.

### 🟩 Google Agenda — *cronograma*
- **Bom:** cronograma visual, blocos de tempo (time-blocking), lembretes.
- **Pra cá:** já temos agenda unificada + feed iCal. Adicionar **cronograma de
  estudos** (blocos por matéria na semana) e **countdown de provas** (dias até o
  ENEM/vestibular) alimentando o plano do dia.

---

## 4. Blocos de funcionalidade propostos

### A. 🎯 Foco & Ambiente (Forest + Pomodoro + AppBlock + Spotify)
- [ ] Mixer de **sons ambiente** (Web Audio, offline): ruído branco/rosa/marrom,
      chuva, ondas, vento, "café". Volume por camada, presets salvos.
- [ ] **Modo foco imersivo** (fullscreen): só timer + som + matéria; esconde UI.
- [ ] **Presets de Pomodoro** (25/5, 50/10, 52/17, 90-min) + ciclos automáticos.
- [ ] **Planta/árvore** que cresce na sessão e vira jardim de constância.
- [ ] Contador de pomodoros do dia; pausa longa a cada 4 ciclos.

### B. 🧠 Memorização & Revisão (Quizlet + Anki + Duolingo)
- [ ] Modos de flashcard: **Combinar (jogo)**, **Escrever**, **Teste (múltipla
      escolha)**, **Verdadeiro/Falso**.
- [ ] **Revisão espaçada** já existe — expor a curva de retenção e "próxima revisão".
- [ ] Micro-lições diárias sugeridas (5-10 min do que está mais esquecido).
- [ ] Áudio/pronúncia (temos `speak`) — bom pra idiomas.

### C. 📝 Captura & Notas (Notion + Keep + GoodNotes)
- [ ] **Templates de nota**: Cornell, Feynman, resumo de aula, mapa mental, lista.
- [ ] Captura rápida (voz→texto, foto, colar) para a Inbox.
- [ ] **Canvas de rascunho** (desenho livre) anexável a nota.
- [ ] Nota → flashcards (temos) + nota → questões de teste (novo).

### D. 🛤️ Aprendizado Estruturado (Khan + Duolingo + Trello)
- [ ] **Trilhas de domínio** por matéria: tópicos com barra de "mastery".
- [ ] **Quadro Kanban de estudo** (Para estudar / Estudando / Revisar / Dominado).
- [ ] Biblioteca de **materiais** por matéria (PDF/link/resumo IA) — `StudyContent`.

### E. 📅 Planejamento & Provas (Google Agenda + ENEM/Vestibular)
- [ ] **Cronograma semanal** de estudos (blocos por matéria).
- [ ] **Countdown de provas** (ENEM, vestibulares) + plano regressivo.
- [ ] Meta diária/semanal ajustável; balanço "no ritmo / atrasado".

### F. 🇧🇷 Preparação ENEM / Vestibular (o diferencial nacional)
- [ ] **Banco de questões** por área (Linguagens, Humanas, Natureza, Matemática)
      — criadas pelo aluno/IA; com gabarito e explicação.
- [ ] **Simulados** cronometrados + correção; nota estimada (estilo TRI simplificado).
- [ ] **Redação**: editor com estrutura dissertativo-argumentativa, contador de
      linhas, e **correção por IA nas 5 competências do ENEM** (0-1000).
- [ ] Cronograma por áreas do ENEM + pesos.

### G. 🤖 Tutor de IA (o cérebro que já temos, aplicado a estudo)
- [ ] "Me explique como se eu tivesse 5 anos" / Feynman reverso.
- [ ] Gerar questões e flashcards a partir de qualquer nota/conteúdo.
- [ ] Corrigir redação (5 competências) e exercícios.
- [ ] Plano de estudos personalizado a partir das metas + tempo disponível.
- [ ] Resumir PDF/vídeo/artigo do material.

### H. 🏆 Motivação (Duolingo + Forest)
- [ ] Metas diárias, **streak freeze**, lembrete inteligente por notificação.
- [ ] Conquistas/medalhas honestas (constância, domínio, maratonas).
- [ ] Ligas/ranking — só se multiusuário fizer sentido (privacidade primeiro).

---

## 5. Checklist priorizado (fases de execução)

> Regra de risco: o banco roda em **modo réplica/Turso** — migração de schema é
> arriscada (`ensureSchema` só faz CREATE, não ALTER). Priorizar itens **sem
> schema novo**; itens que exigem tabela nova ficam marcados 🗄️ e vão em lote,
> aplicados com cuidado (baseline + derive + push controlado).

### ⚡ Fase 1 — Ganhos rápidos, ZERO schema (começar já)
- [x] **A1. Mixer de sons ambiente** (Web Audio, offline) — `lib/focus-sounds.ts` +
      `components/studies/focus-sounds.tsx`, na página de Estudos. ✅ 2026-07-21
- [x] **A2. Presets de Pomodoro** (25/5, 52/17, 90/10, 15/3 com ciclos) — já
      existiam em `study-timer-constants.ts`, ligados ao timer. ✅
- [x] **B1. Modo Combinar** (match game) — `components/flashcards/match-game.tsx`
      via `?mode=match`; de propósito NÃO mexe na SRS. ✅ 2026-07-21
- [x] **B2. Modo Teste** (múltipla escolha gerada dos cards) —
      `components/flashcards/test-mode.tsx` via `?mode=test`; não mexe na SRS.
      (Escrita já existe via `?mode=written`.) ✅ 2026-07-21
- [x] **C1. Templates de nota** (Cornell, Feynman, resumo, mapa mental, checklist)
      — `components/notes/note-templates.ts` + dropdown em `notes-client.tsx`. ✅ 2026-07-21
- [x] **E1. Countdown de provas** — `components/studies/exam-countdown.tsx`
      (localStorage), no topo de Estudos. ✅ 2026-07-21
- [x] **A3. Modo foco imersivo** — botão de tela cheia real (Fullscreen API) no
      `focus-mode-modal.tsx`. ✅ 2026-07-21

**🎉 Fase 1 COMPLETA.** Próximo: Fase 2 (schema 🗄️).

### 🚀 Fase 2 — Alto valor, schema leve/controlado 🗄️
- [x] **F3. Redação ENEM** com correção IA nas 5 competências (0–1000) — SEM
      schema: `app/(dashboard)/studies/actions/redacao.ts` (`gradeEnemEssay`, com
      fallback estrutural local sem IA) + `components/studies/redacao-corrector.tsx`
      + rota `/studies/redacao`; salva como StudyNote via `createBlankNote`. ✅ 2026-07-21
- [x] **D2. Quadro de estudo (Kanban)** — SEM schema: reusa `LearningGoal.status`
      com 4 colunas (Para estudar / Estudando / Revisar / Dominado).
      `components/goals/goals-board.tsx` + `goal-helpers.ts` (regras de coluna/prazo/
      prioridade compartilhadas com a Lista) + `GOAL_STATUSES` em `lib/enums.ts`.
      Alternador Lista/Quadro em `/goals` (lembrado no localStorage), arrastar no
      desktop e setas ‹ › no toque, "+" cria já na coluna. ✅ 2026-07-21
- [x] **D1. Trilhas de domínio (mastery)** — SEM schema: `lib/study-mastery.ts`
      (módulo puro) calcula 0–100 por matéria a partir de 4 pilares que o app já
      registra — Tempo (vs. `goalMinutes`), Memória (cartões com `interval ≥ 21d`),
      Constância (dias ativos em 30) e Objetivos (metas concluídas).
      `components/studies/mastery-tracks.tsx` na página de Estudos. ✅ 2026-07-21
- [x] **F1. Banco de questões** 🗄️ — models `Question` + `QuestionOption`.
      `app/(dashboard)/studies/actions/questions.ts` (CRUD + `generateQuestions` por
      IA, com recado honesto quando não há provedor) + `/studies/questoes`
      (`question-bank.tsx`, `question-form-dialog.tsx`, `question-ai-dialog.tsx`).
      Guarda aproveitamento por questão (`timesAnswered`/`timesCorrect`), que é o
      que alimenta a estratégia "Meus erros". ✅ 2026-07-22
- [x] **F2. Simulados** 🗄️ — models `Exam` + `ExamAttempt`.
      `actions/exams.ts` (montagem por estratégia, `startAttempt`, `submitAttempt`)
      + `lib/exam-scoring.ts` (TRI simplificada, módulo puro) + `lib/exam-shared.ts`.
      Rotas: `/studies/simulados` (montar/refazer/evolução), `/studies/simulados/[id]`
      (prova cronometrada) e `.../resultado/[attemptId]` (gabarito comentado). ✅ 2026-07-22

> **Três decisões do lote F1+F2:**
> 1. **O gabarito nunca vai para o cliente durante a prova.** A rota da prova
>    seleciona a questão SEM `isCorrect`/`explanation`; a correção acontece no
>    servidor (`submitAttempt`). Não dá para colar pelo DevTools.
> 2. **"TRI simplificada" é honesta sobre o que é.** Acerto ponderado pela
>    dificuldade × fator de coerência (errar fácil e acertar difícil desconta até
>    40%). Não é o modelo logístico do INEP — e a UI diz isso ao aluno.
> 3. **A lista de questões do simulado é JSON** (`Exam.questionIds`), como o
>    `WorkoutPlan`: é o SNAPSHOT da prova montada, não um relacionamento vivo.
>    Editar uma questão depois não reescreve o histórico da prova.

**🎉 Fase 2 COMPLETA.** Próximo: Fase 3 (refino e encanto).

> **Honestidade da nota de domínio (D1):** pilar SEM dado (matéria sem flashcards,
> sem metas) **não** pontua zero — sai da média e o peso é redistribuído, senão o
> app puniria quem ainda não cadastrou nada. E o selo "Dominado" exige todos os
> pilares com dado acima de 60: média alta puxada por tempo+constância, com a
> memória no chão, para em "Avançado". A nota numérica segue sendo a média real.

### 🌟 Fase 3 — Refino e encanto
- [ ] H1. Streak freeze + lembrete inteligente (notificação).
- [ ] E2. Cronograma semanal (time-blocking) integrado à agenda.
- [ ] G*. Tutor de IA proativo (plano personalizado, resumos, Feynman).
- [ ] C3. Canvas de rascunho (GoodNotes-lite).
- [ ] A4. Jardim/floresta de constância (evolução do heatmap).

---

## 6. Decisões técnicas

- **Reusar sempre:** `lib/srs.ts` (agendamento único cliente+servidor), o timer/
  FocusSession existentes, `StudyContent` para materiais, `StudyNote` para
  redação/templates, `LearningGoal/Task` para Kanban e trilhas.
- **Sem migração arriscada:** tudo que der para fazer com os modelos atuais +
  `localStorage`/config do usuário vem primeiro. Sons, presets, modos de card,
  countdown, templates e Kanban NÃO precisam de tabela nova.
- **Sons offline (CSP-safe):** gerados via Web Audio API (ruído + filtros), sem
  buscar áudio externo — respeita a CSP dos artefatos e a filosofia offline.
- **IA com fallback:** toda feature de IA (questões, redação, resumo) degrada com
  mensagem amigável — nada quebra sem IA (padrão do projeto).
- **Conectado por design:** cada novidade se liga às outras (nota→card→questão→
  simulado→plano→foco→ELO). Ver [[connected-by-design]].

---

## 7. Status de execução

- [x] Levantamento de requisitos + este documento.
- [x] **Fase 1 COMPLETA** — A1 (sons), A2 (pomodoro), B1 (combinar), B2 (teste),
      C1 (templates), E1 (countdown), A3 (foco fullscreen). Tudo sem schema novo.
- [x] **Fase 2 · F3** — Redação ENEM com correção IA (5 competências) entregue,
      SEM schema (reusa StudyNote).
- [x] **Fase 2 · D2 + D1** — Quadro de estudo (Kanban de metas) e Trilhas de
      domínio (mastery por matéria). Ambos SEM schema novo. ✅ 2026-07-21
- [x] **Fase 2 · F1 + F2** — Banco de questões e Simulados entregues COM schema
      novo (4 models). ✅ 2026-07-22
- [ ] **Fase 3** (próxima): H1 streak freeze + lembrete, E2 cronograma semanal,
      G* tutor de IA proativo, C3 canvas de rascunho, A4 jardim de constância.

### 🗄️ Como o schema novo foi aplicado (receita que funcionou)

`prisma db push` **não serve** aqui: ele mira o `DATABASE_URL` do `.env` (arquivo
local) e, pior, propôs dropar uma coluna com dado (`RecurringExpense.autoPay`,
drift antigo). O caminho certo, sem perder nada:

1. Editar `prisma/schema.prisma` (models + relações no `User`).
2. `npm run db:derive` → schemas postgres/mysql derivados.
3. `npm run db:generate:all` → os 3 clients.
4. `npm run db:baseline` (+ `:postgres` e `:mysql`) → baselines regenerados.
5. `npm run db:ensure` → aplica o baseline **no primário Turso**, de forma
   idempotente (`CREATE TABLE IF NOT EXISTS`), sem tocar em nada existente.

> Se o passo 5 falhar com `fetch failed / ConnectTimeoutError`, é o primário
> demorando mais que os 10s do undici para aceitar a conexão — repetir resolve.

> Garantias a cada passo: `tsc --noEmit` (projeto inteiro) + ESLint verdes; import
> em runtime dos módulos puros (templates + motor de som) sem erro.
