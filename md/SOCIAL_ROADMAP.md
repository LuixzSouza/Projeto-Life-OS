# Life OS — Roadmap da Camada Social ("Círculo")

> Documento vivo (criado em 13/jun/2026). A grande ideia: transformar o Life OS de
> um "segundo cérebro" solo em algo onde **amigos se conectam, conversam, veem o
> progresso uns dos outros e competem entre si** — porque a melhor coisa é a amizade.
> Marque `[x]` ao concluir; adicione ideias no fim de cada seção.

**Nome de trabalho da camada social: "Círculo"** (o seu círculo de amigos). Alternativas:
Convívio, Aliados, Squad, Liga. *(decidir a marca antes do lançamento)*

---

## 0. Princípios inegociáveis (lê antes de tudo)

1. **Opt-in radical.** O Life OS continua 100% funcional, local e offline para quem
   NÃO ativar o Círculo. Nada de vida pessoal sai do PC sem o usuário ligar e escolher.
   A filosofia "sem nuvem obrigatória" do projeto fica intacta — o Círculo é *aditivo*.
2. **Você controla cada gota.** Granularidade por dado e por amigo/grupo: "meus amigos
   próximos veem meu treino, o resto vê só meu streak". Nada é público por padrão.
3. **Dados de vida ficam locais; só o COMPARTILHADO sobe.** O hub na nuvem guarda
   apenas: identidade pública, amizades, mensagens e os *snapshots de stats que você
   optou por publicar*. O extrato financeiro, notas, senhas etc. NUNCA sobem.
4. **Amizade > vaidade.** Competição é tempero (motivar, brincar, cobrar com carinho),
   não vergonha. Sempre dá pra sair de um ranking, esconder número, jogar "só por mim".
5. **Reaproveitar o que já existe.** Perfil (avatar/cover/bio), constância/heatmap,
   PRs de treino, foco, hábitos, XP de estudos, convites por link+QR, sino+web push.

---

## Arquitetura: o "Hub Social" (Supabase)

Cada amigo roda o Life OS no próprio PC (local-first). Para eles se encontrarem,
existe **um hub central na nuvem (Supabase)** — o ponto de encontro. Decisão tomada
em 13/jun/2026: **Supabase** (Postgres gerenciado + Realtime + Auth + Storage + RLS).

```
   PC do Ana            PC do Bruno            Celular da Ana
  (Life OS local)      (Life OS local)        (PWA / réplica)
       │                     │                       │
       └──── publica opt-in ─┴──── lê social ────────┘
                         ▼
              ┌───────────────────────┐
              │   SUPABASE (Círculo)   │  profiles · friendships · messages
              │  Postgres + Realtime   │  shared_stats · challenges · reactions
              │   Auth · Storage · RLS │  (somente dados compartilhados)
              └───────────────────────┘
```

- **Ponte de identidade:** o `User` local ganha um vínculo com uma identidade no hub
  (handle `@usuario` + id Supabase). Login no hub via Supabase Auth (magic link/senha).
- **Publicação:** um job no app empacota os stats *que você liberou* e faz `upsert`
  em `shared_stats` (1×/dia + ao abrir + sob demanda). É um snapshot, não acesso ao
  seu banco.
- **Leitura:** o app lê do hub (amigos, perfis, mensagens, rankings) via client
  Supabase + Realtime para chat/presença.
- **RLS é a espinha dorsal:** policies garantem que você só lê o que amigos liberaram
  pra você. Sem RLS correta, vaza tudo — é a parte mais crítica de segurança.
- **Custo:** começar no free tier do Supabase; monitorar limites (DB 500MB, Realtime,
  Storage). Mídia de chat comprimida (já temos `compressToDataUrl`).

**Dependências novas:** `@supabase/supabase-js`. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE` só no server, nunca no client).

---

## Fase 0 — Fundação do Hub (pré-requisito de tudo)

- [ ] **Projeto Supabase + schema social** (via migrations): `profiles`, `friendships`
      (status: pending/accepted/blocked), `share_settings`, `shared_stats`,
      `messages`, `conversations`, `conversation_members`, `challenges`,
      `challenge_participants`, `reactions`, `activity_highlights`.
- [ ] **RLS em TODAS as tabelas** + testes de policy (ninguém lê o que não é amigo /
      não foi liberado). Tratar como feature de segurança de 1ª classe.
- [ ] **Ponte de identidade:** campo `socialHandle`/`socialUserId` no `User` local
      (schema! `prisma db push`), tela "Ativar Círculo" que cria/loga a identidade no
      hub e reivindica um `@handle` único.
- [ ] **Client Supabase no app** (`lib/social/hub.ts`): wrapper tipado, sessão, helpers
      de leitura/escrita, tratamento de offline (fila + retry, reusar padrão da
      `mutation-queue` do treino).
- [ ] **Painel "Círculo" em Configurações → Privacidade & Compartilhamento:** ligar/
      desligar, escolher o que é compartilhável (toggles por categoria), revogar tudo.
- **Done quando:** dá pra ativar o Círculo, ter um @handle, e nada sobe sem opt-in.

## Fase 1 — Identidade & Amizades (a base social)

- [ ] **Perfil público** (reusa `avatarUrl`/`coverUrl`/`bio`): card com nome, @handle,
      avatar, capa, bio, "vibe/status" curto, e os destaques que você liberar.
- [ ] **Pedidos de amizade**: enviar/aceitar/recusar/bloquear; lista de amigos.
- [ ] **Descoberta & convite**: por @handle, por **link/QR de convite** (reusar o
      padrão lz-string + QR já usado em fichas de treino e iCal), por contatos do CRM.
- [ ] **Ponte CRM ↔ amigo real**: quando um `Friend` (CRM) também está na plataforma,
      sugerir vincular ("Ana já usa o Life OS — conectar?"). Mantém os dois conceitos:
      CRM = quem você acompanha; Amigo = conexão viva no hub.
- [ ] **Grupos/círculos** (próximos, treino, estudo) para mirar compartilhamento.
- **Done quando:** Ana e Bruno viram amigos no hub e veem o perfil um do outro.

## Fase 2 — Perfil vivo: "como o amigo está saindo"

- [ ] **Stats compartilhados (opt-in, granular):** streak/constância, treinos na semana,
      horas de foco, hábitos mantidos, PRs recentes, XP/nível de estudo, peso (só se
      liberar). Cada um com toggle e "quem vê".
- [ ] **Heatmap de constância no perfil** (reusar `activity-heatmap` / `activity-days.ts`)
      — o "GitHub graph" da vida, comparável entre amigos.
- [ ] **Feed de destaques** (opt-in): "Ana bateu PR no supino (+5kg)", "Bruno: 30 dias
      de constância 🔥", "Ana terminou o livro X". Gerado dos eventos locais → publica
      highlight no hub. Reusar o motor de `ActivityLog`/`logActivity`.
- [ ] **Reações/cheers** nos destaques (👏🔥💪) — incentivo social leve.
- [ ] **Comparativo amigável** ("vocês dois: foco essa semana") sem ranking pesado.
- **Done quando:** abrir o perfil de um amigo conta a história da semana dele (do que
      ele liberou), com heatmap e destaques.

## Fase 3 — Chat (o "WhatsApp" do Círculo)

- [ ] **1:1 em tempo real** (Supabase Realtime): enviar/receber, histórico paginado,
      indicador de entregue/lido, "digitando…", presença (online/visto por último).
- [ ] **Mídia**: imagens (Storage + compressão), depois áudio (reusar o
      `recording-provider` de reuniões para gravar voz), reações e responder mensagem.
- [ ] **Grupos** (conversa de vários membros) + nome/foto do grupo.
- [ ] **Notificações**: in-app (sino) + **web push/PWA** (já temos SW + Notification
      API) para chegar mensagem com o app fechado.
- [ ] **Atalhos sociais**: "puxar assunto" a partir de um destaque ("manda parabéns pelo
      PR"), compartilhar uma conquista direto no chat.
- [ ] **Privacidade do chat**: bloquear, silenciar, apagar pra mim, reportar.
- **Done quando:** dá pra conversar em tempo real, 1:1 e em grupo, com push.

## Fase 4 — Competição & Gamificação social (o que vicia)

- [ ] **Rankings semanais** entre amigos/grupos: constância, volume de treino, horas de
      foco, hábitos, XP. Cada métrica é um "placar"; entrar é opt-in.
- [ ] **Duelos/desafios entre amigos** (estender o model `Challenge` para o hub):
      "quem treina mais essa semana", "30 dias de leitura", "foco diário 1h". Aceitar,
      acompanhar progresso ao vivo, ver quem está ganhando.
- [ ] **Ligas/temporadas** (mensal): sobe/desce de liga, medalhas, "MVP do mês".
- [ ] **Conquistas compartilhadas + badges** (estender `UserStats.badges`): exibir no
      perfil, comemorar no feed, dar cheers.
- [ ] **Streaks em conjunto** ("vocês dois: 12 dias seguidos treinando") — accountability.
- **Done quando:** existe um ranking semanal vivo + pelo menos 1 tipo de desafio entre
      amigos do início ao fim, com comemoração.

## Fase 5 — Social profundo ("fora da casinha")

- [ ] **Parceiro de responsabilidade (accountability):** compartilhar uma meta com 1
      amigo que "cobra" (lembrete pra ele se você falhar; com seu consentimento).
- [ ] **Metas co-op**: meta de grupo (somatório), barra coletiva.
- [ ] **Compartilhar fichas/rotinas de treino e decks de flashcard** pelo hub (hoje já
      tem export por link; levar pro feed/chat com 1 toque + "importar").
- [ ] **"Treinar junto" ao vivo**: presença na sessão de treino — ver que o amigo está
      treinando agora e mandar um 🔥; placar da sessão lado a lado.
- [ ] **Status efêmero (stories-like)**: "foco modo ON", "PR hoje!", some em 24h.
- [ ] **Retrospectiva social**: comparar o mês com amigos (do que liberar), reações.
- **Done quando:** o app vira um lugar onde a galera se motiva junto, não só conversa.

---

## Cross-cutting (vale para todas as fases)

- [ ] **Segurança/RLS**: revisão dedicada por fase; o hub nunca expõe dado não-liberado.
- [ ] **Moderação**: bloquear, reportar, sumir conteúdo; limites anti-spam.
- [ ] **Resiliência offline**: fila de envio (chat/publicação) com retry, como o treino.
- [ ] **Custo & escala**: monitorar free tier do Supabase; comprimir mídia; paginar tudo.
- [ ] **Mobile/PWA**: chat e push impecáveis no celular (é onde a galera vai usar mais).
- [ ] **Onboarding**: ativar o Círculo em < 1 min (handle + 1 amigo + 1 toggle).
- [ ] **Antiabuso de saúde mental**: sempre poder "modo silencioso" / sair de rankings.

## Riscos & decisões em aberto

- **RLS mal feita = vazamento.** Maior risco técnico. Testes de policy obrigatórios.
- **Privacidade vs. social.** Default sempre fechado; cada exposição é escolha ativa.
- **Custo do realtime/storage** se crescer. Plano: começar pequeno, medir, otimizar.
- **Identidade**: Supabase Auth próprio vs. reaproveitar o login local. *(decidir Fase 0)*
- **CRM vs. amigo real**: manter os dois ou fundir? Proposta: manter e *vincular*.

## MVP recomendado (a primeira fatia que entrega valor real)

**Fase 0 + Fase 1 + chat 1:1 (parte da Fase 3) + perfil com streak (parte da Fase 2).**
Ou seja: ativar o Círculo, virar amigo de alguém, ver o perfil/streak dele e **conversar
em tempo real**. Isso já é "uau". Competição (Fase 4) vem logo depois, porque é o que
prende — mas precisa da base social de pé primeiro.

---

*Como usar: pegar 1 fase (ou uma fatia dela) por ciclo. Itens com "(schema!)" ou de
Supabase exigem migration — no app local, parar o dev antes do `prisma generate`; no
hub, aplicar migration no Supabase e atualizar as policies RLS junto.*
