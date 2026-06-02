# Life OS - Master Plan de Refatoração Completa

## 🎯 VISÃO GERAL

Transformar codebase de **237 TSX + 22 TS** em projeto modular, limpoe reutilizável.

**Problema:** 39 arquivos com 300+ linhas + duplicação massiva + padrões inconsistentes  
**Alvo:** <200 linhas/arquivo + zero duplicação + padrões claros

---

## 📊 ESTADO ATUAL vs ALVO

```
HOJE:                          ALVO:
├─ 237 TSX, 22 TS              ├─ 237 TSX → 120+ (modular)
├─ 39 arquivos 300+ linhas     ├─ Max 200 linhas/arquivo
├─ ~5 componentes shared       ├─ 30-40 componentes shared
├─ Muita duplicação            ├─ Zero duplicação
├─ Padrões inconsistentes      ├─ Padrões claros/documentados
├─ Type safety 95%             ├─ Type safety 100%
├─ Bundle ~2.4M                └─ Bundle ~2.0M (-15-20%)
```

---

## 📋 4 PILARES DO REFACTOR

### PILAR 1: FILE SPLITTING ⭐ (Semana 1-2)
**Quebrar 39 arquivos gigantescos em arquivos pequenos e mantíveis**

```
Total afetado: 40+ arquivos, ~11,000 linhas
├─ 10 action files → 30+ files (settings, finance, ai, projects, health, studies)
├─ 15+ components → 50+ files (health, studies, finance, projects, etc)
├─ 5 page files → 20+ files (dashboard, studies, projects, etc)
└─ Ganho: +80% legibilidade, -70% arquivo médio
```

**Checklist:**
- [ ] Split action files (settings/finance/ai/projects/studies/health)
- [ ] Split large components (weekly-planner, business-view, study-timer, etc)
- [ ] Split page files (dashboard, studies, projects)
- [ ] Verificar imports (index.ts re-exports)
- [ ] Rodar tsc + lint

---

### PILAR 2: COMPONENTES COMPARTILHADOS (Semana 2)
**Extrair componentes reutilizáveis e eliminar duplicação**

```
Total: ~50 linhas ganhas de duplicação
├─ FormField genérico → -100+ linhas
├─ Dialog patterns → -150+ linhas
├─ Card patterns → -100+ linhas
├─ DataTable genérico → -200+ linhas
└─ Ganho: -550+ linhas duplicadas
```

**Checklist:**
- [ ] `components/ui/form-field.tsx`
- [ ] `components/dialogs/form-dialog.tsx`
- [ ] `components/dialogs/confirm-dialog.tsx`
- [ ] `components/ui/cards/base-card.tsx`
- [ ] `components/data-table/data-table.tsx`
- [ ] Aplicar em 20+ páginas

---

### PILAR 3: ORGANIZAÇÃO MODULAR (Semana 3)
**Estruturar cada módulo com padrão consistente**

```
components/[module]/
├─ index.ts (re-exports públicas)
├─ [feature]/
│   ├─ [feature].tsx
│   ├─ [feature]-dialog.tsx
│   ├─ [feature]-form.tsx
│   ├─ types.ts
│   └─ hooks.ts
├─ shared/
│   ├─ hooks.ts
│   ├─ types.ts
│   └─ constants.ts
└─ README.md
```

**Checklist:**
- [ ] Finance (account, transaction, recurring, wishlist)
- [ ] Health (workout, nutrition, sleep, metrics)
- [ ] Projects (project, task)
- [ ] Studies (subject, session, note)
- [ ] Social (friend, contact)
- [ ] E mais 12 módulos

---

### PILAR 4: TYPE SYSTEM UNIFICADO (Semana 3-4)
**Consolidar tipos em lib/ e eliminar duplicação**

```
lib/
├─ types/
│   ├─ common.ts (Id, UserId, BaseEntity, enum Status)
│   ├─ forms.ts (FormState, FormError, SubmitResult)
│   ├─ ui.ts (variant types)
│   ├─ finance.ts
│   ├─ health.ts
│   └─ ... (1 per domain)
├─ validation/
│   ├─ schemas.ts (Zod schemas)
│   ├─ messages.ts (erro msgs PT-BR)
│   └─ helpers.ts
└─ hooks/
    ├─ useMutation.ts
    ├─ useList.ts
    ├─ useForm.ts
    └─ ... (10+ hooks)
```

**Checklist:**
- [ ] lib/types/ consolidado
- [ ] lib/validation/ consolidado
- [ ] lib/hooks/ consolidado
- [ ] Remover types espalhados em app/ e components/

---

## 🚀 CRONOGRAMA EXECUTIVO (5 Semanas)

```
SEMANA 1 (Jun 1-7):
├─ FILE SPLITTING - Phase A (action files)
│  └─ settings/actions.ts (850) → 5 files
│  └─ finance/actions.ts (558) → 3 files
│  └─ ai/actions.ts (547) → 2 files
│  └─ + 7 outros
├─ QUICK WINS
│  └─ SubmitButton component
│  └─ useMutation hook
│  └─ Zod schemas consolidado
└─ Ganho: 30+ novos arquivos bem estruturados

SEMANA 2 (Jun 8-14):
├─ FILE SPLITTING - Phase B (large components)
│  └─ weekly-planner.tsx (813) → 5 files
│  └─ business-view.tsx (690) → 4 files
│  └─ + 13 outros (500+ linhas)
├─ COMPONENTES COMPARTILHADOS
│  └─ FormField genérico
│  └─ Dialog/Modal patterns
│  └─ Card components
│  └─ DataTable genérico
└─ Ganho: 50+ novos arquivos + padrões

SEMANA 3 (Jun 15-21):
├─ FILE SPLITTING - Phase C (pages)
│  └─ dashboard/page.tsx (602) → 7 files
│  └─ + 4 outras pages
├─ REORGANIZAÇÃO MODULAR
│  └─ Finance module
│  └─ Health module
│  └─ Projects/Studies/Social
└─ Ganho: 20+ novos arquivos organizados

SEMANA 3.5-4 (Jun 22-28):
├─ TYPE SYSTEM UNIFICADO
│  └─ lib/types/ consolidado
│  └─ lib/validation/ consolidado
│  └─ lib/hooks/ consolidado
└─ Ganho: -duplicação types, +reusability

SEMANA 5 (Jun 29-5 Jul):
├─ PERFORMANCE & DOCS
│  └─ Bundle analysis
│  └─ Lazy imports
│  └─ README por módulo
└─ Ganho: -15% bundle, documentação
```

---

## ✅ QUICK WINS (Semana 1, Paralelo)

Execute HOJE enquanto faz file splitting:

1. **SubmitButton component** (1 dia) → padrão em 20+ páginas
2. **useMutation hook** (1 dia) → padrão em TODA app
3. **Zod schemas consolidado** (1 dia) → type-safe
4. **Git cleanup commit** (1 hora) → .db files removidos
5. **Remove dialogs inline** (1-2 dias) → padrão visual

---

## 📊 DOCUMENTOS CRIADOS

✅ **REFACTOR_CHECKLIST.md** — checklist completo (40+ itens)  
✅ **ANALYSIS.md** — problemas específicos + exemplos  
✅ **ROADMAP_EXECUCAO.md** — plano dia-a-dia (5 semanas)  
✅ **FILE_SPLITTING_GUIDE.md** — como dividir 40+ arquivos  
✅ **REFACTOR_SUMMARY.txt** — resumo visual rápido  
✅ **REFACTOR_MASTER_PLAN.md** (este arquivo)  

---

## 🎬 COMO COMEÇAR HOJE

### Opção A: Começar com File Splitting (Recomendado)

```bash
# 1. Ler documentação
cat FILE_SPLITTING_GUIDE.md

# 2. Escolher um action file (MAIS FÁCIL)
# Ex: app/(dashboard)/settings/actions.ts (850 linhas)

# 3. Criar estrutura
mkdir -p app/(dashboard)/settings/actions

# 4. Mover funções para files específicos
# settings/actions/user.ts
# settings/actions/app.ts
# settings/actions/integrations.ts
# settings/actions/backup.ts
# settings/actions/admin.ts

# 5. Criar index.ts com re-exports
touch app/(dashboard)/settings/actions/index.ts

# 6. Teste
npm run lint
tsc --noEmit

# 7. Deletar arquivo original
rm app/(dashboard)/settings/actions.ts

# 8. Commit
git add .
git commit -m "refactor: split settings actions into modules"
```

### Opção B: Começar com Componentes Compartilhados

```bash
# 1. Criar SubmitButton
touch components/ui/submit-button.tsx
# Copiar código de ROADMAP_EXECUCAO.md

# 2. Testar
npm run dev

# 3. Aplicar em 3 módulos (finance, projects, studies)

# 4. Commit
git commit -m "feat: add submit button with loading state"
```

### Opção C: Começar com Zod Schemas

```bash
# 1. Consolidar
mkdir -p lib/validation
touch lib/validation/{schemas,messages,helpers}.ts

# 2. Mover schemas do app inteiro para lib/validation

# 3. Commit
git commit -m "refactor: consolidate zod schemas in lib/validation"
```

---

## 📈 MÉTRICAS DE SUCESSO

Acompanhar durante refactor:

```bash
# Verificar tamanho máximo de arquivo
find app components -name "*.tsx" -o -name "*.ts" | \
  xargs wc -l | sort -rn | head -5

# Contar arquivos > 300 linhas
find app components -name "*.tsx" -o -name "*.ts" | \
  while read f; do lines=$(wc -l < "$f"); [ $lines -gt 300 ] && echo "$lines | $f"; done | wc -l

# Type check
tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

**Meta:**
- [ ] 0 arquivos com 300+ linhas
- [ ] Máximo: 200 linhas/arquivo
- [ ] Média: 100 linhas/arquivo
- [ ] tsc --noEmit: exit 0
- [ ] eslint: zero warnings

---

## 🎁 BENEFÍCIOS ESPERADOS

Após 5 semanas completas:

```
ANTES:              DEPOIS:
├─ 237 TSX          ├─ 120+ TSX (modular)
├─ Max 850 linhas   ├─ Max 200 linhas
├─ Média 400 ln     ├─ Média 100 ln
├─ ~5 shared comp   ├─ 30-40 shared comp
├─ 70% duplicação   ├─ <5% duplicação
├─ Type safe 95%    ├─ Type safe 100%
├─ Bundle ~2.4M     ├─ Bundle ~2.0M
├─ +5 dias novo dev ├─ +1 dia novo dev
└─ Confuso          └─ Cristalino
```

**ROI:**
- +50% developer velocity
- -30% bugs (type-safe)
- -70% duplicate code
- +70% legibilidade
- +80% findability

---

## 🔥 PRIORITY ORDER

Se só conseguir fazer 1 coisa esta semana:

**🥇 FILE SPLITTING** (padrão para todos os arquivos gigantescos)  
**🥈 COMPONENTES COMPARTILHADOS** (eliminar duplicação)  
**🥉 TYPE SYSTEM** (type-safe)  

---

## ⏰ PRÓXIMAS AÇÕES (HOJE)

- [ ] Ler FILE_SPLITTING_GUIDE.md (30 min)
- [ ] Escolher 1 action file para split (settings recomendado)
- [ ] Criar estrutura de pastas
- [ ] Mover 1 função para testar (ex: updateUserProfile)
- [ ] Verificar imports funcionam
- [ ] Rodar tsc + lint
- [ ] Commit primeira divisão

---

**Tempo Total Estimado:** 20-30 dias  
**Status:** 🔴 Not Started  
**Prioridade:** 🔥 CRÍTICA

---

## 📚 Leia Também

- REFACTOR_CHECKLIST.md — checklist completo
- FILE_SPLITTING_GUIDE.md — guia detalhado de file splitting
- ANALYSIS.md — problemas e soluções
- ROADMAP_EXECUCAO.md — plano dia-a-dia
