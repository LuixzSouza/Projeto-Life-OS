# 📅 Roadmap da Agenda — análise completa e melhorias

> Auditoria feita em 10/jun/2026 lendo o código real do módulo
> (`app/(dashboard)/agenda/*` + `components/agenda/*` + `lib/agenda-aggregator.ts`).
> Priorizado por impacto × esforço, no mesmo formato do `IA_ROADMAP.md`.

---

## ✅ O que JÁ temos (e é muito)

| Capacidade | Onde vive |
|---|---|
| **Agregador unificado de ~20 fontes** (eventos, refeições, treinos, estudos, sono, corpo, mídia, closet, conexões + aniversários recorrentes, finanças, vagas + follow-ups, tarefas, desafios, reuniões, faturas, contas fixas, cobranças recorrentes, flashcards, metas, feriados) | `lib/agenda-aggregator.ts` |
| 6 abas: Calendário (mês/dia + filtros por categoria), Blocos, Planner, Foco, Tarefas, Rotina | `app/(dashboard)/agenda/page.tsx` |
| Time-Blocking 6h–23h com snap de 15min, task→bloco, ✓ concluir do bloco, ▶ Foco vinculado | `components/agenda/time-blocking-day.tsx` |
| Planner semanal (Método Alastrar): riscar otimista, adição rápida por coluna | `components/agenda/week-planner.tsx` |
| Dias Temáticos tingindo mês/planner/blocos | `components/agenda/themed-days.tsx` |
| Lembretes de blocos (poll 60s → toast + Notification, dedup por dia) | `components/agenda/block-reminders.tsx` |
| Insights de Foco + correlações (#8) na aba Foco | `focus-actions.ts` (`getFocusStats`/`getFocusDrivers`) |
| Editar/excluir evento direto do calendário (diálogos ÚNICOS, lixeira) | `unified-agenda.tsx` |
| Rotina diária com seed + rotação de limpeza | `routine-manager.tsx`, `cleaning-rotation-dialog.tsx` |

---

## 🐛 Débitos encontrados na auditoria (corrigir antes de feature nova)

### D1. Código morto (~22 KB em 3 componentes órfãos)
`agenda-week-grid.tsx`, `agenda-month-grid.tsx` e `event-list.tsx` **não são importados
por ninguém** (grep confirmado). O `event-list` é o legado com `<Dialog>` dentro do `.map`
que a grade de Blocos substituiu. **Apagar os 3** (validar com `tsc --noEmit` depois).

### D2. Campos mortos no schema
`Event.isAllDay` e `Event.category` existem no banco mas o `EventForm` não os expõe e o
agregador os ignora — evento "dia inteiro" hoje aparece com horário fake (ex.: 00:00).
Ou expor no form (checkbox "dia inteiro" → entra na seção "Dia inteiro" da visão Dia),
ou assumir que não serão usados. **Expor é barato e útil.**

### D3. Performance do agregador (o maior risco de escala)
`getAgendaItems` dispara **20 queries** em `Promise.all` a cada visita — somadas às do
`page.tsx`, ~28 queries por load, TODA navegação de mês. Agravantes:
- Quase todos os `findMany` **sem `select`** → trazem linhas inteiras (ex.: `friends`
  precisa só de `{id, name, birthday, createdAt}` mas traz notas, telefone etc.).
- **Sem `take`** em fontes que crescem sem limite (transactions num mês movimentado,
  tasks, media) — a janela de 6 semanas pode virar centenas de itens serializados.
- No modo réplica/nuvem cada query tem latência de rede.
**Fazer:** `select` enxuto por fonte + `take` defensivo (ex.: 500/fonte) + medir.
(Cache curto é tentador, mas invalidação multi-módulo é traiçoeira — medir antes.)

### D4. Lembrete com antecedência fixa de 30min
`block-reminders.tsx` avisa sempre 30min antes — a memória do projeto já apontava
"lead time configurável" como pendência. 1 campo em Settings resolve.

### D5. Estado efêmero que deveria persistir
- Filtros de categoria do calendário (`hidden`) somem no refresh → persistir em
  `localStorage` (padrão já usado no projeto inteiro).
- **Aba ativa não vai pra URL** (`?tab=blocks`) → refresh volta pro Calendário e é
  impossível deep-linkar (o botão "▶ Foco" da home poderia abrir direto a aba certa).

---

## 🥇 TIER 1 — Alto impacto no uso diário

### 1. Criar evento de onde você está olhando
Hoje só o header ("Registrar") e a grade de Blocos criam evento. Faltam:
- Visão **Dia** do calendário: botão "+ Adicionar neste dia" (pré-preenche a data).
- Visão **Mês**: hover do dia mostra um "+" discreto (padrão Google Calendar).
O `EventForm` já aceita `defaultStart`/`defaultEnd` — é só ligar.

### 2. Eventos recorrentes ("toda segunda, 7h, academia")
Contas fixas já têm motor de recorrência (`lib/recurrence.ts` — âncora + frequência +
endDate)! Reusar no Event: campos `frequency`/`endDate` (schema → fluxo réplica),
ocorrências expandidas no agregador (mesma técnica do `recurringExpenses`), e edição
"só esta / todas". É a feature mais pedida de qualquer calendário.

### 3. Arrastar para reagendar
- **Blocos:** arrastar bloco verticalmente (snap 15min) = mudar horário; borda inferior
  = redimensionar duração. `onPointerDown/Move/Up` + o snap que já existe — sem lib.
- **Planner:** arrastar tarefa entre colunas de dia = mudar `dueDate`.
Os dois fecham o ciclo "planejei errado → corrijo em 1 gesto" (hoje: abrir diálogo).

### 4. Visão Semana no calendário unificado
Entre Mês (denso) e Dia (1 dia), falta a visão que mais se usa para planejar: 7 colunas
com os itens do agregador. O grid das colunas já existe no Planner — generalizar.

---

## 🥈 TIER 2 — Diferenciais

### 5. Agenda + IA (o módulo ainda não conversa com o Cérebro)
- Botão "Analisar com IA" no header (todos os módulos têm, Agenda **não** tem).
- Prompt pronto: "Organize minha semana" → IA lê tarefas sem bloco + blocos livres e
  PROPÕE alocações (preview confirmável, padrão Inbox Mágica). É o item #12 do
  IA_ROADMAP aterrissando na Agenda.

### 6. "Agora" como centro de gravidade (modo Hoje)
Um painel "Hoje" mobile-first: linha do tempo vertical do dia com o bloco ATUAL
destacado + o próximo + atalho ▶ Foco. No celular, a visão Mês é apertada; "Hoje"
seria a aba default em telas pequenas (o dado já existe: `itemsToday`/`nextUp`).

### 7. Sobreposição de blocos
`time-blocking-day.tsx` posiciona blocos por horário, mas dois blocos no mesmo
horário se sobrepõem visualmente. Algoritmo clássico de colunas paralelas
(dividir largura entre blocos que colidem) resolve.

### 8. Capacidade do dia (orçamento de tempo)
Soma das durações dos blocos vs horas úteis do dia: "6h30 alocadas / 17h úteis" no
topo da grade + aviso visual quando o dia passa de X% (dia irreal = frustração).
SQL zero: os eventos já estão na mão.

### 9. Busca na agenda
Com ~20 fontes agregadas, achar "consulta do dentista" exige rolar meses. Um campo
de busca client-side sobre `items` (título/subtítulo) na toolbar do calendário.

---

## 🥉 TIER 3 — Integração com o mundo

### 10. Exportar/assinar .ics
Gerar `.ics` dos eventos (e opcionalmente do feed agregado) p/ importar no Google
Calendar/Outlook. Local-first: arquivo gerado no client, sem serviço externo.
(Import .ics é o passo 2 — parsing é mais chato, biblioteca `ical.js`.)

### 11. Notificações fora da aba
`BlockReminders` só avisa com o app aberto. O PWA já existe (gym) — service worker +
Notification agendada local (sem push server) cobre "lembrete com o app fechado"
em Android/desktop. iOS é limitado — degradar com graça.

### 12. Lembrete por e-mail (o campo `emailAlert` já existe!)
`Event.emailAlert` está no schema desde sempre e nada envia e-mail. Ou implementar
(Resend/SMTP opt-in nas Configurações) ou renomear o conceito para "lembrete local".

---

## 🗺️ Ordem recomendada (impacto ÷ esforço)

1. **D1 + D5** — apagar código morto + persistir filtros/aba na URL (1 sessão, risco zero)
2. **#1 Criar evento contextual** (EventForm já aceita defaults)
3. **D3 selects/takes no agregador** (escala + nuvem agradece)
4. **#3 Arrastar blocos** (transforma o uso diário do Time-Blocking)
5. **#2 Recorrência de eventos** (motor pronto em `lib/recurrence.ts`; única com schema)
6. **#5 Agenda+IA** e **#6 modo Hoje** (visíveis e únicos)
7. **D2/D4, #4, #7–#9** conforme apetite; Tier 3 quando houver demanda real.

---

## ⚠️ Regras de ouro (lições do projeto que se aplicam aqui)

- **Diálogo ÚNICO controlado por estado** — nunca `<Dialog>` dentro de `.map`
  (o `event-list.tsx` morto está aí de prova do bug antigo).
- **Datas de `<input type="date">`**: sempre `T12:00:00Z` (bug do "dia anterior").
- **Aniversários**: ler com `getUTC*` (gravados ao meio-dia UTC) — já correto no agregador.
- **Schema novo** (recorrência de evento): `npm run db:baseline` →
  `node scripts/turso-reconcile.mjs` → sync da réplica. `db push` sozinho NÃO basta.
- **Réplica/libSQL**: nada de `_max/_min` de DateTime em aggregate, nada de ler
  DateTime dentro de `$transaction` interativa.
- **Todo modelo novo datado entra no agregador** (`lib/agenda-aggregator.ts`) — regra
  viva do projeto; o inverso também: fonte nova = pensar no custo (D3).
