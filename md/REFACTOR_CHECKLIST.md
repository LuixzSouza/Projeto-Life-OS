# Life OS - Checklist de Refatoração & Organização

**Status:** Projeto em manutenção — 237 arquivos TSX, 22 TS, 572K app/, 2.4M components/

---

## 🎯 Objetivos

- ✅ Componentes reutilizáveis, zero duplicação
- ✅ Organização clara (shared, module-specific, features)
- ✅ Padrões consistentes (dialogs, forms, modais, cards)
- ✅ Type safety 100% (zero `any`)
- ✅ Performance otimizada (re-renders, lazy loading)
- ✅ Documentação local (README por módulo)

---

## 📋 CHECKLIST EXECUTIVO

### FASE 1: ANÁLISE & LIMPEZA (Semana 1)

- [ ] **1.1 - Auditoria de Duplicação**
  - [ ] Procurar forms repetidos (dialog, input patterns)
  - [ ] Procurar cards repetidos (transaction, wishlist, etc)
  - [ ] Procurar hooks customizados duplicados
  - [ ] Listar tipos duplicados (interfaces de form, estado)

- [ ] **1.2 - Análise de Estrutura de Componentes**
  - [ ] Componentes em `components/` que deveriam estar em module (`components/finance/` vs `components/dashboard/`)
  - [ ] Componentes em `app/` que deveriam estar em `components/`
  - [ ] Arquivo solto (`lock-screen.tsx`, `console-welcome.tsx`) — mover ou categorizar
  - [ ] Quantidade de componentes por módulo (identificar outliers)

- [ ] **1.3 - Audit Técnico**
  - [ ] TypeScript errors (rodar `tsc --noEmit`)
  - [ ] Unused imports (verificar ESLint)
  - [ ] Componentes não utilizados (tree-shake análise)
  - [ ] Props types faltando

- [ ] **1.4 - Audit de Arquivos Gigantescos** ⭐
  - [ ] Listar arquivos com 300+ linhas (39 encontrados)
  - [ ] Agrupar por tipo: action files, components, pages
  - [ ] Priorizar split (começar pelos 15 maiores)
  - [ ] Documentar padrão de divisão

---

### FASE 1.5: FILE SPLITTING (Semana 1.5-2)

**39 arquivos com 300+ linhas precisam ser divididos**

- [ ] **Action Files Split** (10 arquivos, ~3000 linhas)
  - [ ] `settings/actions.ts` (850) → 5 files
  - [ ] `finance/actions.ts` (558) → 3 files
  - [ ] `ai/actions.ts` (547) → 2 files
  - [ ] `projects/actions.ts` (459) → 2 files
  - [ ] `studies/actions.ts` (319) → 2 files
  - [ ] `health/actions.ts` (382) → 3 files
  - [ ] Demais módulos (agenda, business, cms, entertainment, links, social, wardrobe)

- [ ] **Large Components Split** (15+ arquivos, ~6000 linhas)
  - [ ] `weekly-planner.tsx` (813) → 5 files
  - [ ] `business-view.tsx` (690) → 4 files
  - [ ] `mobile-section.tsx` (685) → 4 files
  - [ ] `study-timer.tsx` (566) → 3 files
  - [ ] E mais 11 grandes components

- [ ] **Page Files Split** (5 arquivos, ~2000 linhas)
  - [ ] `dashboard/page.tsx` (602) → 7 files
  - [ ] `studies/page.tsx` (384) → 4 files
  - [ ] `projects/[slug]/page.tsx` (356) → 3 files
  - [ ] Demais pages

**Resultado:** 40+ arquivos divididos em ~130 arquivos de 100-200 linhas

---

### FASE 2: PADRÕES COMPARTILHADOS (Semana 2)

- [ ] **2.1 - Form Components (Shared)**
  - [ ] Extrair `<FormField>` genérico (com label, error, hint)
  - [ ] Extrair `<FormAction>` (com loading state, toast feedback)
  - [ ] Biblioteca de validadores Zod reutilizáveis
  - [ ] Padrão único para "create/edit" dialogs

- [ ] **2.2 - Dialog & Modal Patterns**
  - [ ] Audit todos os `<Dialog>` → migrar para padrão DialogHeader/Body/Footer
  - [ ] Criar `<ConfirmDialog>` genérico (para delete/cancel flows)
  - [ ] Criar `<FormDialog>` (form + dialog unified)
  - [ ] Remover inline modals de listas (.map())

- [ ] **2.3 - Data Table / List Components**
  - [ ] Extrair `<DataTable>` genérico (sort, filter, pagination)
  - [ ] Extrair `<TableActions>` (edit, delete, export)
  - [ ] Criar padrão para "empty state" + "loading skeleton"
  - [ ] Padrão único para filtros (date range, select, search)

- [ ] **2.4 - Card Components**
  - [ ] Audit todos os cards → padrão `<BaseCard>` + variantes (info, action, stat)
  - [ ] `<StatCard>` (número + label + trend)
  - [ ] `<TransactionCard>` (exemplo p/ finance)
  - [ ] `<ItemCard>` com menu dropdown (pattern reutilizável)

---

### FASE 3: REORGANIZAÇÃO DE MÓDULOS (Semana 3)

- [ ] **3.1 - Estrutura Padrão por Módulo**
  ```
  components/[module]/
  ├── index.ts (exports públicas)
  ├── [feature]/
  │   ├── [feature]-dialog.tsx
  │   ├── [feature]-card.tsx
  │   ├── [feature]-form.tsx
  │   └── types.ts
  ├── hooks/
  │   └── use[Feature].ts
  ├── actions.ts (re-exports de app/)
  ├── constants.ts
  └── README.md
  ```

- [ ] **3.2 - Finance Module Refactor**
  - [ ] Reorganizar subpastas (account, transaction, recurring, wishlist)
  - [ ] Extrair `<AccountCard>`, `<TransactionItem>`, `<RecurringBadge>` components
  - [ ] Consolidar hooks (useAccounts, useTransactions, useRecurring)
  - [ ] README.md com mapa de componentes

- [ ] **3.3 - Health Module Refactor**
  - [ ] Reorganizar (workout, nutrition, sleep, metrics)
  - [ ] Componentes genéricos (MetricCard, WorkoutLog, MealCard)
  - [ ] Chart reusables (WorkoutChart, NutritionChart, etc)
  - [ ] README.md

- [ ] **3.4 - Projects/Studies/Flashcards Refactor**
  - [ ] Extrair componentes task/subject reutilizáveis
  - [ ] ProgressBar + Stat patterns
  - [ ] Form patterns (task creation, subject editing)

---

### FASE 4: SHARED UTILITIES & TYPES (Semana 3-4)

- [ ] **4.1 - Type System Unificado**
  - [ ] Pasta `lib/types/` (consolidar types de toda app)
  - [ ] `lib/types/common.ts` (id, userId, timestamps, status enums)
  - [ ] `lib/types/forms.ts` (form states, errors, validation schemas)
  - [ ] `lib/types/ui.ts` (variant types, component props)

- [ ] **4.2 - Hooks Compartilhados**
  - [ ] `useForm` (wrapper genérico)
  - [ ] `useMutation` (server action wrapper com loading/error)
  - [ ] `useList` (fetch com filtering/pagination)
  - [ ] `useSortAndFilter` (estado compartilhado)

- [ ] **4.3 - Utilitários**
  - [ ] `lib/format/` (formatters: currency, date, time)
  - [ ] `lib/validation/` (zod schemas compartilhadas)
  - [ ] `lib/icons/` (icon mosaicos por categoria)
  - [ ] `lib/constants/` (colors, status, enums globais)

---

### FASE 5: PERFORMANCE & OTIMIZAÇÃO (Semana 4)

- [ ] **5.1 - Code Splitting**
  - [ ] `components/` → lazy load por módulo
  - [ ] Dialogs → `dynamic()` import em client
  - [ ] Charts → `dynamic()` (Recharts é heavy)

- [ ] **5.2 - Render Optimization**
  - [ ] Audit `useCallback` / `useMemo` em lists
  - [ ] Remove re-renders desnecessários (React DevTools Profiler)
  - [ ] Virtualização de listas longas (tanstack/react-virtual)

- [ ] **5.3 - Bundle Size**
  - [ ] Rodar `npm run build` com analyze (next-bundle-analyzer)
  - [ ] Remover libraries duplicadas
  - [ ] Consolidar ícones (lucide vs custom SVGs)

---

### FASE 6: DOCUMENTAÇÃO & DX (Ongoing)

- [ ] **6.1 - README por Módulo**
  - [ ] `components/[module]/README.md` com component tree
  - [ ] Exemplos de uso (copy-paste ready)
  - [ ] Props documentation (auto-gerado ou manual)

- [ ] **6.2 - Storybook (Opcional)**
  - [ ] Setup Storybook p/ UI components
  - [ ] Stories para: FormField, DataTable, Card, Dialog
  - [ ] Accessibility tests

- [ ] **6.3 - Type Documentation**
  - [ ] JSDoc comments em types complexas
  - [ ] Enums com comentários
  - [ ] Helper functions comentadas

---

## 🔴 PRIORIDADE: Quick Wins

Começa por **ESTAS 5** antes do resto:

1. **Remover duplicação de Forms** → 1-2 dias
   - Procurar `.map()` com `<Dialog>` inline → mover para modal global
   - Extrair `<FormField>` padrão
   - Resultado: -30-50 linhas de código, +5 componentes shared

2. **Padrão único para Cards** → 2-3 dias
   - Audit todos os cards
   - Criar `<BaseCard>` + variantes
   - Aplicar em: transactions, wishlist, items, workouts
   - Resultado: visual consistency, -50+ linhas

3. **Data Tables / Lists** → 2-3 dias
   - Extrair `<DataTable>` (sort, filter, pagination unified)
   - Aplicar em: transactions, projects, links, flashcards
   - Resultado: comportamento consistente, -100+ linhas

4. **Consolidar Types** → 1-2 dias
   - Mover todos os types para `lib/types/`
   - Remover duplicação de interfaces
   - Resultado: single source of truth

5. **Shared Hooks** → 2-3 dias
   - `useMutation` wrapper para server actions
   - `useList` com filtering
   - Resultado: padrão em todas as páginas

---

## 📊 MÉTRICAS DE SUCESSO

Depois de completar o checklist:

- [ ] Componentes shared: **30-40** (vs ~5 hoje)
- [ ] Duplicação: **reduzida em 70%+**
- [ ] Type errors: **0** (100% type-safe)
- [ ] Bundle size: **reduzido em 10-15%**
- [ ] Re-renders: **reduzidos via profiler**
- [ ] README coverage: **100% (todos os módulos)**

---

## 🚀 PRÓXIMAS SESSÕES

Após refactor:

1. **Design System v2** (variantes de cores, dark mode)
2. **Componentes de Forma** (Recharts charts vs custom)
3. **Multi-user Features** (compartilhamento, permissões)
4. **PWA Offline** (service workers, cache strategy)
5. **i18n Internacionalização** (support PT-BR, EN)

---

**Última atualização:** Jun 1, 2026  
**Responsável:** LuixzSouza  
**Prioridade:** Alta — impacto em DX, maintainability, performance
