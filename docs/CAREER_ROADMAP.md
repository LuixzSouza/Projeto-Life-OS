# Career OS — Arquitetura: Vagas & Currículos v2

> Documento de design. Objetivo: evoluir o módulo `/jobs` para um "Career OS" —
> currículos versionados ATS-friendly, PDF à prova de falhas, captura de vagas
> sem fricção e rastreabilidade total entre vaga ↔ versão exata do CV enviado.

---

## 0. Diagnóstico do que já existe (não reinventar)

| Peça | Estado | Veredito |
|---|---|---|
| `JobApplication` + `JobEvent` | Funil completo (7 estágios, timeline, follow-up, prioridade, matchScore, coverLetter persistidos) | **Manter** — só estender |
| `JobTracker` (list/grid/board) | UI madura com busca, sort, filtro follow-up | **Manter** |
| `Portfolio` (JSON único, `userId @unique`) | 1 currículo por usuário | **Evoluir** → N currículos versionados |
| `ResumeBuilder` + `ResumePreview` | Autosave, preview A4 escalado, health score | **Manter o editor**, trocar o motor de export |
| Export PDF | `window.print` + CSS print (2col→1col) | **Substituir** por react-pdf (`pdf-kit.tsx`) |
| IA (`ai-actions.ts`) | Carta + análise de match com fallback | **Estender** (parser de vaga, tradução, tailoring) |
| Agenda | `followUpDate` já agregado | **Estender** (entrevistas) |

---

## 1. Modelo de dados

### 1.1 `Resume` — currículos versionados (novo model)

```prisma
model Resume {
  id        String   @id @default(uuid())
  name      String            // "Base", "Front-end · Nubank", "English · Remote"
  locale    String   @default("pt-BR") // pt-BR | en-US
  template  String   @default("ATS")   // ATS | MODERN (2 colunas)
  isBase    Boolean  @default(false)   // exatamente 1 por usuário (enforce na action)
  parentId  String?           // de qual currículo foi clonado (linhagem)
  data      String            // PortfolioData JSON (mesmo shape de types/portfolio.ts)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs   JobApplication[]

  @@index([userId])
}
```

**Migração suave** (padrão da casa): na primeira visita, se o usuário tem
`Portfolio` e zero `Resume`, a action copia `Portfolio.data` para um
`Resume { name: "Currículo Base", isBase: true }`. `Portfolio` fica como
legado read-only por 1 release e depois sai do schema.

Decisão de design: **clone completo, não overlay/diff**. Versões por vaga são
cópias integrais do JSON. Overlays (guardar só o delta) parecem elegantes mas
são uma armadilha: rebase mental a cada edição do base, merge conflicts sem UI
para resolvê-los. JSON de currículo tem ~10-30 KB; clonar é grátis no SQLite.

### 1.2 Rastreabilidade — snapshot imutável na vaga

```prisma
model JobApplication {
  // ... campos atuais ...
  resumeId       String?   // versão "viva" vinculada (editável)
  resume         Resume?   @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  resumeSnapshot String?   // JSON congelado no momento do "Enviei!"
  snapshotAt     DateTime? // quando foi congelado

  // Preparação
  prepNotes      String?   // markdown livre (área de estudo)
  requirementsChecklist String? // JSON: { id, label, status: "ok"|"studying"|"gap" }[]
  keywords       String?   // JSON string[] extraídas da vaga (alimenta ATS score)
  source         String?   // LinkedIn | Gupy | Indeed | Site | Indicação
  interviewAt    DateTime? // próxima entrevista → agenda-aggregator
}
```

A dupla `resumeId` + `resumeSnapshot` resolve o problema clássico: o vínculo
vivo permite continuar lapidando o CV durante o processo; o snapshot garante
que "o que a empresa recebeu" nunca muda, mesmo que a versão viva seja editada
ou deletada (`SetNull` não apaga o snapshot). O PDF exato pode ser
re-renderizado a qualquer momento a partir do snapshot — não é preciso
armazenar o binário.

**Checklist pós-schema:** `npx prisma generate` + `npx prisma db push` (parar o
`npm run dev` antes — lock da DLL no Windows), registrar `Resume` em
`lib/full-backup.ts`, replicar em `schema.postgres.prisma` / `schema.mysql.prisma`
e no baseline.

---

## 2. PDF à prova de falhas — a decisão técnica central

### As três abordagens, sem romance

| Abordagem | Prós | Contras | Veredito |
|---|---|---|---|
| **A. `@react-pdf/renderer`** (já no projeto via `pdf-kit.tsx`) | Motor de layout próprio (Yoga/flexbox) → **determinístico**: mesmo output em qualquer máquina/navegador. Paginação nativa com controle fino (`wrap`, `break`, `minPresenceAhead`, `fixed`). Fontes embutidas (Geist já registrada). Roda no cliente — local-first, zero servidor. | Preview HTML ≠ template PDF (dois renders para manter) | ✅ **Escolha** |
| B. Chromium headless (Puppeteer/Playwright) no servidor | Paridade pixel-perfect com o preview HTML | Pesado, quebra no Vercel serverless, mata a portabilidade local-first, +300 MB de dependência | ❌ |
| C. `window.print` (atual) | Zero código extra | Cabeçalho/rodapé do navegador, margens imprevisíveis, quebra de página via CSS `break-inside` é loteria entre engines, usuário pode errar as opções do diálogo | ❌ (manter só como fallback escondido) |

### Por que o react-pdf não quebra layout (as garantias concretas)

O medo de "texto longo estourar" vem do HTML impresso. No react-pdf o layout é
resolvido pelo motor, e a paginação obedece regras declarativas:

```tsx
// Cada experiência é um bloco atômico: se não couber inteira E for curta,
// vai inteira para a próxima página. Se for longa, quebra entre bullets.
<View wrap={cabe ? false : true} minPresenceAhead={40}>
  <ExperienceHeader />        {/* nunca órfão: minPresenceAhead garante */}
  {bullets.map(b => <Bullet key={b.id} text={b} />)}  {/* cada bullet é indivisível */}
</View>

// Título de seção nunca fica sozinho no fim da página:
<Text style={s.sectionTitle} minPresenceAhead={60}>EXPERIÊNCIA</Text>

// Rodapé com paginação em toda página:
<Text fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
```

Regras do template para nunca sobrepor/cortar:
1. **Zero posicionamento absoluto** no fluxo de conteúdo (só no rodapé `fixed`).
2. **Nada de alturas fixas** — tudo `flex` com `flexGrow`, texto dita a altura.
3. Hifenização desligada (já é padrão do `pdf-kit`) + `maxWidth: '100%'` — palavras
   gigantes (URLs) usam `Text` com `hyphenationCallback` que quebra em `/` e `-`.
4. **Teste de estresse fixo**: um `Resume` seed com 12 experiências, bullets de
   500 caracteres e títulos sem espaço — rodar visualmente a cada mudança de template.

### Arquitetura de arquivos

```
components/pdf/resume-pdf.tsx     ← templates ATS e MODERN sobre o pdf-kit
components/projects/resume/
  resume-preview.tsx              ← preview HTML (mantém, é o editor WYSIWYG)
  use-resume-export.ts            ← hook: dynamic import do react-pdf + download
```

Import dinâmico (padrão da casa) para não pagar o peso do react-pdf no bundle
da página. O mesmo componente `ResumePdf` recebe `PortfolioData` — serve tanto
para a versão viva quanto para re-baixar um `resumeSnapshot`.

---

## 3. Design ATS-friendly — dois templates, um propósito cada

**Template `ATS` (padrão, o "que funciona"):**
- **Uma coluna**, ordem clássica: Contato → Resumo → Experiência → Formação → Skills → Certificações → Idiomas.
- Sem foto, sem ícones, sem barras de proficiência, sem tabelas — parsers de ATS
  antigos leem texto linear; colunas embaralham a ordem de leitura.
- Títulos de seção canônicos ("Experiência Profissional" / "Professional Experience")
  — ATS faz match por heading conhecido.
- Datas em formato consistente (`Jan 2024 – Atual`), bullets começando com verbo
  de ação + métrica.
- Skills como lista de texto separada por vírgula (parsers extraem keywords daí).

**Template `MODERN` (o atual, 2 colunas):** mantém para envio direto a humanos
(e-mail, indicação) e para impressão. O usuário escolhe no export; default ATS.

**ATS Score (evolução do `resume-health.ts`):** com a vaga vinculada, calcular
cobertura de `keywords` da vaga no texto do CV → painel "13/18 keywords ✓ · faltam:
Docker, CI/CD, Terraform" com botão "Ajustar com IA" (tailoring, seção 5).

---

## 4. Internacionalização (PT ⇄ EN)

Dois níveis, separados de propósito:

1. **Chrome do documento** (títulos de seção, labels "Atual/Present", formato de
   data): dicionário determinístico `lib/resume-i18n.ts` keyed por `locale`.
   Zero IA, zero latência, zero erro.
2. **Conteúdo** (bullets, resumo, descrições): action `translateResume(resumeId)`
   → clona o Resume com `locale: "en-US"`, IA traduz **campo a campo mantendo o
   shape do JSON** (prompt retorna o mesmo objeto; validar com o mesmo parse do
   import JSON). Regras no prompt: não traduzir nomes próprios, empresas, stack;
   manter métricas. Com fallback: sem IA configurada, clona com strings originais
   e marca os campos pendentes.

Detalhes que todo mundo esquece: página **Letter em vez de A4** quando
`locale = en-US` (mercado US), telefone com `+55`, e remover foto sempre no
template ATS (nos EUA foto em CV é red flag).

---

## 5. Captura de vaga sem fricção — "Inbox de Vagas"

Fluxo: botão único **"+ Vaga"** abre dialog com um textarea gigante:
**"Cole o link ou o texto da vaga"**.

```
parseJobPosting(input) — server action
  1. Se for URL → fetch server-side do HTML → extrai texto (strip tags)
     ⚠️ LinkedIn/Gupy/Greenhouse bloqueiam scraping (login-wall) →
     se o fetch falhar ou vier < 300 chars úteis, mostrar inline:
     "Este site bloqueia leitura automática — cole o texto da vaga"
     O caminho COLAR TEXTO é o primário; a URL é o atalho otimista.
  2. IA extrai JSON tipado: { company, role, location, salary, seniority,
     modality, requirements: string[], keywords: string[], niceToHave: string[] }
  3. Fallback sem IA: heurísticas (primeira linha = título; regex de salário
     "R$ X.XXX"; linhas com "•/-" viram requirements).
  4. NUNCA salva direto: pré-preenche o JobForm para o usuário confirmar (2s de
     revisão evita lixo no banco).
```

`requirements` extraídos viram automaticamente o `requirementsChecklist`
(status inicial: sem classificação) e `keywords` alimentam o ATS score.

---

## 6. Página da vaga — de card para "war room"

Hoje a vaga vive em dialogs sobre o tracker. Criar rota `/jobs/[id]` (drawer no
desktop, página no mobile) com 4 abas:

| Aba | Conteúdo |
|---|---|
| **Visão geral** | Dados da vaga, funil/timeline (`JobEvent`, já existe), follow-up, link, salário, contato |
| **Preparação** | Checklist de requisitos (✅ domino / 📚 estudando / ⚠️ gap) + notas markdown (`prepNotes`). Cada item "estudando" ganha botão "Criar nota de estudo" → ponte com o módulo Studies (conectado por design) |
| **Currículo** | Versão vinculada + snapshot: "Enviado em 03/07 · Front-end EN v2" com [Baixar PDF exato] [Ver diff com o base] |
| **IA** | Carta (existe), match score (existe), **novo: tailoring** — "sugerir ajustes no CV para esta vaga" (reescreve bullets priorizando keywords; usuário aceita item a item, nunca overwrite silencioso) |

`interviewAt` entra no `agenda-aggregator` (mesmo padrão do `followUpDate`, que
já está lá) → entrevista aparece no calendário e no briefing diário.

---

## 7. Gerenciador de currículos — nova aba no `/jobs`

A aba "Currículo" atual (builder direto) vira **"Currículos"**: grid de cards —
nome, locale (🇧🇷/🇺🇸), template, `updatedAt`, badge "Base", contagem "3 vagas
usam esta versão". Ações por card: Editar · Clonar · Traduzir → EN · Exportar
PDF · Excluir (bloqueado se for o Base; aviso se houver vagas vinculadas —
snapshots sobrevivem).

Fluxo-chave **"Aplicar nesta vaga"** (o coração da rastreabilidade):

```
Vaga → [Candidatei-me] → modal:
  "Qual currículo você enviou?"
  ( ) Currículo Base
  (•) Front-end · Nubank        ← sugerido: já vinculado
  ( ) + Clonar o Base para esta vaga
  [Confirmar] → grava resumeId + congela resumeSnapshot + JobEvent("APPLIED")
```

---

## 8. Fases de implementação

| Fase | Entrega | Risco |
|---|---|---|
| **1. Fundação** | Model `Resume` + migração do `Portfolio` + gerenciador de versões (clonar/renomear/excluir) | Migração de dados — fazer idempotente |
| **2. PDF** | `resume-pdf.tsx` (template ATS) + export via pdf-kit + teste de estresse | Nenhum — aditivo |
| **3. Rastreabilidade** | `resumeId`/`resumeSnapshot` + modal "qual CV enviou?" + aba Currículo na vaga | Baixo |
| **4. Captura** | `parseJobPosting` (URL + texto + fallback) | Scraping bloqueado — mitigado pelo caminho texto |
| **5. Preparação** | `/jobs/[id]` com checklist + notas + entrevista na agenda | Baixo |
| **6. Polimento** | Tradução EN, template MODERN no export, tailoring IA, ATS score | Depende de IA configurada — sempre com fallback |

Cada fase é shippável sozinha e nada quebra o que existe.

## 9. Pontos cegos cobertos (checklist de revisão)

- [x] Scraping bloqueado (LinkedIn/Gupy) → colar texto é o caminho primário
- [x] CV editado depois do envio → snapshot imutável, não vínculo vivo
- [x] Excluir currículo com vagas ligadas → `SetNull` + snapshot preservado
- [x] Texto extenso no PDF → react-pdf com `wrap`/`minPresenceAhead` + seed de estresse
- [x] Palavras sem espaço/URLs longas → hyphenationCallback custom por `/` e `-`
- [x] EN nos EUA → Letter, sem foto, formato de data
- [x] Explosão de versões → clone integral simples + "vagas que usam" visível no card
- [x] IA indisponível → todo fluxo tem fallback manual (padrão da casa)
- [x] Backup completo → registrar `Resume` no `full-backup.ts`
- [x] Multi-banco → mudanças replicadas nos 3 schemas + baseline (não driftar)
- [x] Modais em `.map()` → modal global única com `selectedItem` (diretriz do CLAUDE.md)
