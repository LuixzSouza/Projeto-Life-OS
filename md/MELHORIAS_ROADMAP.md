# Life OS — Roadmap Geral de Melhorias

> Documento vivo (criado em 10/jun/2026). Mapeia melhorias por área para o sistema
> "não faltar nada". Marque `[x]` ao concluir e adicione novas ideias no fim de cada seção.

---

## 1. Acesso Remoto & Infraestrutura (dados no SEU PC)

A visão: o computador é o servidor da casa. Celular e outros aparelhos são só janelas.

- [x] **Modo Híbrido (réplica + Turso + Vercel)** — escritas no PC vão ao primário na hora;
      celular acessa a instância na nuvem. *(já implementado)*
- [x] **Launcher desktop** — clicar e abrir, servidor em segundo plano, `Fechar Life OS.bat`. *(já implementado)*
- [x] **Painel "Acesso Remoto" em Configurações → Dados & Sistema** — QR code da rede local
      + guia Tailscale + status do modo híbrido. *(10/jun/2026)*
- [x] **Iniciar com o Windows** — toggle no painel Acesso Remoto (cria atalho `--no-open` em
      `shell:startup` via `scripts/startup-windows.ps1`). *(11/jun/2026)*
- [x] **Firewall sem fricção** — `scripts/allow-firewall.ps1` (auto-eleva, portas 3000-3011 só
      em redes privadas) + botão "Liberar" no painel de Acesso Remoto. *(11/jun/2026)*
- [x] **HTTPS local (opcional)** — `scripts/enable-https.ps1` (detecta Tailscale e gera o
      certificado; orienta mkcert como alternativa) + `scripts/https-proxy.mjs` (proxy TLS
      sem dependências, porta 3443 → 3000, suporta SSE/WebSocket); pasta `certs/` no
      .gitignore. *(11/jun/2026)*
- [x] **Backup automático agendado** — `lib/auto-backup.ts`: 1×/dia (carona nos lembretes),
      snapshot do .db + export JSON v3 completo, rotação configurável (default 7), card em
      Configurações → Snapshots (pasta pode ser OneDrive/Drive). *(11/jun/2026)*
- [ ] **Migrar o projeto do G:\ (HDD) para C:\ (NVMe)** — compile cai de ~2min para segundos;
      adicionar exclusão no Defender. *(ver memória dev-slow-hdd)*
- [x] **Indicador de conexão no app** — ponto verde/âmbar/vermelho no rodapé da sidebar
      alimentado pelo novo `GET /api/health` (latência + "sync há Xs" na réplica). *(11/jun/2026)*
- [x] **Feed iCal (ICS) da Agenda** — assine no calendário nativo do celular (iPhone/ICSx⁵)
      ou Google Calendar (instância na nuvem): `GET /api/calendar/<token>.ics` com token
      HMAC (userId+tokenVersion+JWT_SECRET — "Desconectar outros dispositivos" renova o
      link), itens de PLANO da Agenda unificada (-14d/+120d), gerador em `lib/ical.ts`,
      seção com link copiável no painel Acesso Remoto. *(11/jun/2026)*

## 2. Projetos (continuação)

- [x] Cards redesenhados: header compacto, status como pontinho, sinais de prazo/ritmo,
      etiqueta PARA passiva, "parado há N dias". *(10/jun/2026)*
- [x] Menu ⋯: concluir/reativar, pausar/retomar, duplicar (template), classificar PARA,
      exportar Markdown. *(10/jun/2026)*
- [x] Filtro "Atrasados" + ordenação "Prazo próximo". *(10/jun/2026)*
- [x] **Prazo do projeto (deadline própria)** — `Project.dueDate` (schema migrado + Turso
      reconciliado), "Definir prazo" no menu ⋯, countdown no card, entra na Agenda. *(11/jun/2026)*
- [x] **Templates de projeto** — "Salvar como template" no menu ⋯ (status TEMPLATE), seção
      própria na listagem, "Usar template" cria projeto novo zerado. *(11/jun/2026)*
- [x] **Subtarefas / checklist dentro da tarefa** — JSON tipado em `Task.checklist`
      (lib/task-checklist.ts), editor com progresso no modal da tarefa. *(11/jun/2026)*
- [x] **Dependências entre tarefas** — "bloqueada por" via EntityLink kind BLOCKS, editor no
      modal + cadeado nas views lista/grade/compacta (BlockedTasksProvider no board).
      *(11/jun/2026)*
- [x] **Visão Timeline/Gantt simples** — 6ª view do board (`?view=timeline`,
      components/projects/task-timeline.tsx): régua semanal (4–8 semanas, auto-ajusta),
      barra criação→prazo com progresso, cores por estado, hoje/fim de semana destacados,
      checkbox otimista, cadeado de dependências, clique abre na lista (deep-link),
      seção "Sem prazo" recolhida. *(11/jun/2026)*
- [x] **Arquivar projeto** (≠ lixeira) — paraType ARCHIVE agora some da lista padrão; filtro
      "Arquivados" mostra. *(11/jun/2026)*
- [x] **Resumo IA do projeto** — botão "Resumo IA" no board: o que falta, riscos, próxima ação
      (one-shot com snapshot do projeto). *(11/jun/2026)*

## 3. Mobile / PWA (a experiência na mão)

- [x] **Auditoria mobile (varredura de código)** — 11/jun/2026: toolbars/abas já tinham
      overflow-x (settings/agenda/projetos/notas/timeline); Dialog base já é mobile-safe
      (gutter + max-h-[90dvh] + corpo rolável); corrigidos os alvos de toque <36px que
      eram ações reais: chat da IA (copiar/regenerar/copiar-código — este era invisível
      no touch por depender de hover), concluir tarefa na agenda, bloco do dia (✓/▶),
      week-planner e dias temáticos — padrão `h-9 w-9 md:h-{6,7}`. Teste visual em
      aparelho real continua valendo a cada feature nova.
- [x] **Ações rápidas no ícone PWA** — shortcut "Captura rápida" (`/dashboard?capture=1` abre
      a Inbox Mágica) somado aos já existentes (Treinar agora, Finanças, Agenda). *(11/jun/2026)*
- [x] **Modo offline gracioso** — `public/offline.html` servida pelo SW quando uma navegação
      falha (só a página offline entra em cache; conteúdo continua sem cache). *(11/jun/2026)*
- [x] **Captura por compartilhamento** (Web Share Target) — `share_target` no manifest +
      rota `/share` → Inbox Mágica pré-preenchida. *(11/jun/2026)*

## 4. Confiabilidade & Segurança

- [x] **Verificação de integridade agendada** — `lib/integrity-watch.ts`: integrity_check
      semanal (carona nos lembretes), Notification HIGH quando encontra problema. *(11/jun/2026)*
- [x] **Exportação completa automática** (JSON) — o backup automático diário já gera o export
      JSON v3 de 100% dos models (melhor que o plano mensal). *(11/jun/2026)*
- [x] **Sessões ativas / dispositivos com "desconectar"** — `User.tokenVersion` (schema
      migrado + Turso reconciliado), JWT carrega `tv`, `getSession` valida com 1 consulta
      cacheada por request (degrada aceitando o token se o banco cair), card "Sessões
      ativas" na aba Segurança com "Desconectar outros dispositivos" (reemite só o cookie
      atual), evento REVOKE no log de acessos, layout redireciona sessão revogada p/
      /login. *(11/jun/2026)*
- [x] **Rate-limit no login** — 5 falhas por email+IP / 10 min (lib/rate-limit.ts). *(11/jun/2026)*
- [x] **Logs de acesso visíveis** — logins (IP + navegador/SO) gravados no ActivityLog e
      listados na aba Segurança. *(11/jun/2026)*

## 5. Qualidade de vida geral (cross-módulo)

- [x] **Busca global (Ctrl+K)** — a palette agora cobre também contatos, fichas de treino,
      decks de flashcards e links salvos (além de notas/projetos/tarefas/navegação). *(11/jun/2026)*
- [x] **Atalhos de teclado** — `g`+letra navega, `n` captura rápida, `t` foco, `?` cheatsheet
      (components/layout/global-hotkeys.tsx). *(11/jun/2026)*
- [x] **Lixeira unificada** — verificado em 11/jun/2026: /trash JÁ cobre os 12 models com
      deletedAt (tarefas, links, desejos, mídia, eventos, conexões, clientes, closet,
      transações, projetos, notas, metas) — o roadmap estava desatualizado.
- [x] **Notificações locais** — verificado em 11/jun/2026: JÁ entregue pelo
      components/agenda/block-reminders.tsx + pollBlockReminders (cobre TODO Event —
      eventos e blocos — com "Alerta" ligado: toast + Notification API via service
      worker, antecedência configurável em Settings, dedup por dia). O roadmap
      estava desatualizado.
- [x] **Tela "Hoje" no dashboard** — seção de chegada logo após o briefing: agenda do dia
      (via agregador unificado, só itens de plano) + tarefas vencidas em destaque.
      *(11/jun/2026)*
- [x] **Retrospectiva do Mês (`/review`)** — página nova no grupo Central: mês consolidado
      módulo a módulo (finanças com top categorias, treinos, estudos, foco, hábitos,
      tarefas/projetos/notas, mídia, sono médio, peso início→fim, refeições) com deltas
      vs mês anterior, navegação ?month=YYYY-MM e botão "Analisar com IA" pré-preenchido
      com os números do mês. Zero schema novo. *(11/jun/2026)* — 2ª rodada: card
      "Tendência · últimos 12 meses" (receita×despesa em barras + linha do saldo,
      clicar num mês navega p/ ele) e "Retrospectiva" entrou na palette Ctrl+K.
      — 3ª rodada: **modo Ano** (`?year=2026`): toggle Mês/Ano sob o título,
      agregado jan–dez com deltas vs ano anterior, navegação por ano e tendência
      do ano inteiro clicável (mergulha no mês).
      — 4ª rodada: **heatmap de Constância** (estilo GitHub): 1 quadradinho por
      dia com intensidade pelo esforço (treino+estudo+foco+hábitos+tarefas),
      tooltip nativo com o breakdown do dia, contador de dias ativos; server
      component puro (zero JS) em components/review/activity-heatmap.tsx.
      — 5ª rodada: **card Constância no dashboard** — mini-heatmap de 16 semanas
      + chip 🔥 "N dias seguidos" (hoje vazio não quebra a sequência) + link p/
      a Retrospectiva; coleta compartilhada extraída p/ lib/activity-days.ts.
      — 6ª rodada: **Exportar PDF** — botão no header (mês e ano) gera o relatório
      via pdf-kit (KPIs de finanças/atividade/saúde, barras de categorias, tabela
      mês a mês); components/pdf/review-document.tsx + lazy-load do react-pdf;
      tipos da Retrospectiva centralizados em components/review/review-types.ts.
- [x] **Tetos por categoria (Finanças)** — primeira UI do model `Category` (dormente
      desde a Fase B): card abaixo do Orçamento 75/10/15 com teto mensal em R$ por
      categoria do extrato, barra de progresso do mês (verde/âmbar ≥80%/vermelho
      estourado), CRUD inline (adicionar via datalist das categorias recentes,
      editar, remover) e chip "N estourados". `finance/actions/budget.ts`
      (setCategoryBudget) + `category-budgets-card.tsx`. *(11/jun/2026)*
      — 2ª rodada: **alertas no sino** — bloco 8.5 do `generateReminders`
      (lib/notifications.ts): BUDGET_WARN ao cruzar 80% e BUDGET_OVER (HIGH) ao
      estourar, 1x por categoria/mês (entityId `nome:YYYY-MM:limiar`), deep-link
      /finance#orcamento; ícone Gauge no sino.
- [x] **Otimizador de espaço** (Configurações → Manutenção) — p/ render o plano grátis:
      análise do que pesa (imagens base64 são o vilão; texto quase nada), recompressão
      de imagens no navegador (canvas → JPEG ≤1024px, só grava se ≥10% menor: Conexões,
      Closet, fotos de treino, imagens de notas, avatar/capa) e faxina seletiva (índice
      semântico da IA regenerável, logs +90d, versões de nota além das 10 últimas,
      lixeira +30d, chats de IA +90d, notificações lidas) + VACUUM automático no modo
      local. `settings/actions/space.ts` + `space-optimizer-card.tsx`. *(11/jun/2026)*

- [x] **Rodada Metas de Aprendizado** — (a) "Sugerir com IA" no diálogo da meta:
      one-shot quebra a meta em 4–6 passos (LearningTasks) com anti-duplicata
      normalizada e fallback local sem IA (`suggestGoalSteps` em goals/actions.ts);
      (b) card mostra o próximo passo em aberto; (c) metas em aberto entraram na
      busca global Ctrl+K com deep-link `/goals?goal=<id>` que abre o diálogo
      direto (searchParam → initialOpenId + useEffect p/ palette sobre /goals).
      *(11/jun/2026)*

- [x] **Nota → Flashcards & IA no editor** — menu ⋯ do editor de notas ganhou
      (a) "Gerar flashcards (IA)": salva a nota se houver edição pendente e chama
      o mesmo motor do chat (`generateFlashcards`, que agora devolve `deck_id`)
      via `generateNoteFlashcards` em notes/actions.ts; toast com ação "Estudar
      agora" (deep-link /flashcards/<deck>/study); (b) "Perguntar à IA": abre
      /ai?q= com prompt de resumo + 3 perguntas de revisão da nota. *(11/jun/2026)*

- [x] **Manter contato (CRM social) — SEM schema** — "falei hoje" vira ActivityLog
      (action CONTACT, module social → aparece na Linha do Tempo de graça); último
      contato derivado em `getLastContacts` (reduzido em JS, sem _max de DateTime);
      cadência por proximidade em `lib/social-contact.ts` (FAMILY/CLOSE 30d, WORK
      60d, CASUAL 90d). UI: botão 🤝 no rodapé do card (otimista), linha/badge
      "sem contato há Xd — reconectar?", KPI "Reconectar" e filtro próprio.
      Sino: bloco 3.5 RECONNECT (resumo semanal, só p/ quem TEM registro — opt-in
      pelo uso). Otimizador de espaço preserva logs CONTACT na faxina de 90d.
      *(11/jun/2026)*

- [x] **Rodada Cofre de Acessos** — (a) aviso de vazamento AO SALVAR: create/update
      consultam HIBP (k-anonymity, timeout 4s, best-effort) quando a senha muda e
      o form avisa "aparece em N vazamentos"; (b) clipboard auto-limpo em 35s
      (só se ainda contiver a senha) + senha revelada auto-oculta em 30s
      (descarta da memória); (c) trilha de auditoria: cada decifração vira
      ActivityLog REVEAL ("Acessou a senha de X") na Linha do Tempo; (d) selo
      "Antiga" (+1 ano sem alteração, proxy updatedAt); (e) faxina: removidos
      4 componentes órfãos (access-credential-fields, access-card-config/
      dialogs/helpers). *(11/jun/2026)*

- [x] **Rodada Biblioteca de Links** — (a) favoritos: `SavedLink.isFavorite`
      estava no schema SEM UI → action `toggleLinkFavorite`, estrela no card
      (otimista), favoritos primeiro na ordenação e filtro "Favoritos" na
      toolbar; (b) colar URL no form com título vazio busca os metadados
      sozinho (onPaste silencioso — copiar→colar→salvar em 1 passo); (c) texto
      do diálogo de remoção corrigido (vai para a lixeira, não é permanente).
      *(11/jun/2026)*

- [x] **PDF de Cobrança (Negócios)** — botão FileDown no card do contrato
      (/business/[id]) gera `cobranca-<titulo>.pdf` via pdf-kit
      (components/pdf/billing-document.tsx, lazy-load): KPIs total/pago/aberto,
      tabela de parcelas (Paga/Pendente/Vencida), caixa PIX e assinatura vindas
      de Configurações › Perfil › Cobrança (mesma fonte do resumo de WhatsApp);
      valores formatados pelo CurrencyProvider. *(11/jun/2026)*

- [x] **Caça a funcionalidades dormentes (varredura)** — (a) `Invoice.linkUrl`
      estava 100% sem UI → campo "Link de pagamento" no modal Ajustar Fatura,
      botão ↗ na linha da parcela e o link da próxima parcela em aberto entra na
      mensagem de cobrança do WhatsApp; (b) **a IA não enxergava as Metas** →
      módulo GOALS completo no Cérebro Digital (query list/summary, CREATE com
      matéria find-or-create + prazo, UPDATE status/prazo, DELETE reversível via
      lixeira, recordLabel) em lib/ai-data.ts + tools.ts/types.ts; (c) deep-link
      de meta no entity-resolver corrigido (/studies → /goals). Verificado sem
      gap: lixeira cobre os 12 models com deletedAt; Shoe/Habit/UserStats têm UI.
      *(11/jun/2026)*

- [x] **Redesign de TODOS os PDFs (identidade da marca)** — pdf-kit reescrito:
      fonte Geist local (public/fonts, woff), paleta zinc do app, header limpo
      com fio gradiente índigo→violeta→rosa (SVG), logo gradiente, SectionTitle
      com bullet, Pill de status, tabelas em card, números em Geist Mono; 5
      documentos restilizados. Cobrança virou documento DO NEGÓCIO do usuário
      (brand override no header) com **QR Code PIX** (lib/pix-payload.ts — BR
      Code EMV + CRC16; valor em aberto preenchido) + copia-e-cola em linhas
      manuais (wrap injetava hífen). Smoke visual: `npx tsx scripts/pdf-smoke.tsx`.
      *(11/jun/2026)*
- [x] **Deploy Vercel + higiene do repositório** — push de deploy-prep e main
      (0ca3d8f→9005168); GH013 do push protection pegou chaves de API no
      backup automático → `/prisma/backups/`, `/dist/` e `/release/` no
      .gitignore e fora do commit. Fix: npm install poda
      node_modules/@lifeos/client-postgres (regenerar com
      `prisma generate --schema prisma/schema.postgres.prisma`). *(11/jun/2026)*

## 6. Distribuição para amigos

Plano completo em **[DISTRIBUICAO.md](./DISTRIBUICAO.md)**: instalador Windows
(Next standalone + Node embutido + Inno Setup), dados de cada amigo no PC dele,
mobile via Acesso Remoto. **Status 11/jun/2026: `release/LifeOS-Setup.exe` GERADO**
(smoke test do standalone ok, Fase 2 codificada — checagem de versão via
`LIFE_OS_UPDATE_URL` + backup pré-update no instalador). Falta: teste real num PC
limpo e o teste de update v1→v2. Fase 3 (Tauri/assinatura/auto-update) é opcional.

---

*Como usar: pegar 1–3 itens por sessão de trabalho, de preferência da mesma seção.
Itens com "(schema!)" exigem migração — parar o dev server antes do `prisma generate`
e, no modo réplica, seguir o fluxo baseline → turso-reconcile → sync.*
