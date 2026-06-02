# Life OS - Roadmap de Execução (Jun 2026)

## 🎯 Visão Geral

```
ESTADO ATUAL:          ALVO REFACTOR:
237 TSX + 22 TS        Modular, type-safe, DRY
2.4M components/       +30 shared components
~5 shared components   Zero duplicação
17 módulos             Padrões consistentes
Muita duplicação       Auto-documentado
```

---

## 📅 CRONOGRAMA RECOMENDADO

### FASE 1: QUICK WINS (Semana de 1 Jun)

**Meta:** Máximo impacto com mínimo esforço

#### Dia 1-2: Remover Dialogs Inline em Maps
**Status:** 🔴 Not Started

```bash
Tarefas:
- [ ] Grep "map()" + Dialog nos arquivos
- [ ] Identificar componentes afetados
- [ ] Mover para modal global (1 dialog per feature)
- [ ] Test em 3 módulos (finance, projects, studies)

Arquivos:
components/finance/
components/projects/
components/studies/

Ganho: -50 linhas, padrão visual consistente
```

---

#### Dia 2-3: Criar Componentes de Botão com Loading

**Status:** 🔴 Not Started

```bash
Criar:
- components/ui/submit-button.tsx
- components/ui/action-button.tsx (icon + text variant)

Padrão:
<SubmitButton isLoading={isPending}>
  Save Changes
</SubmitButton>

Aplicar em:
- components/finance/transaction-dialog.tsx
- components/settings/settings-actions.tsx
- components/projects/project-dialog.tsx
+ 10 outros

Ganho: +padrão visual, -inconsistência, melhor UX
```

---

#### Dia 4-5: Consolidar Zod Schemas

**Status:** 🔴 Not Started

```bash
Criar:
lib/validation/
├── schemas.ts
├── messages.ts
└── types.ts

Consolidar:
- Transaction, Account, Recurring schemas
- Project, Task schemas
- User, Settings schemas
- Form validation messages (PT-BR)

Resultado:
- Single source of truth para validação
- Reuse em forms, API routes, actions

Ganho: -duplicação, +type safety, +DX
```

---

#### Dia 5: Criar useMutation Hook

**Status:** 🔴 Not Started

```bash
Criar:
lib/hooks/useMutation.ts

export function useMutation<T, R>(
  action: (data: T) => Promise<R>,
  options?: UseMutationOptions<T, R>
): UseMutationResult<T, R>

Padrão:
const { mutate, isPending, error } = useMutation(createTransaction);

<Button onClick={() => mutate(formData)} disabled={isPending}>
  Save
</Button>

Aplicar em:
- TODAS as 30+ páginas com formulários
- Substituir try/catch inline

Ganho: -50+ linhas duplicadas, padrão em toda app
```

---

### FASE 2: PADRÕES COMPARTILHADOS (Semana 2: 8-14 Jun)

#### Dia 6-8: FormField Component Genérico

**Status:** 🔴 Not Started

```bash
Criar:
components/ui/form-field.tsx

export function FormField<T>({
  label,
  error,
  type = 'text',
  children,
  required,
  hint,
}: FormFieldProps<T>)

Variantes:
- <FormField type="text" />
- <FormField type="select" options={} />
- <FormField type="date" />
- <FormField type="textarea" />
- <FormField type="checkbox" />

Usar em:
- Todos os 30+ forms

Exemplo:
<FormField label="Amount" error={errors.amount} hint="In currency">
  <Input type="number" value={amount} onChange={setAmount} />
</FormField>

Ganho: -100+ linhas (cada form), padrão visual, acessibilidade
```

---

#### Dia 8-10: Dialog/Modal Patterns

**Status:** 🔴 Not Started

```bash
Audit:
- [ ] Procurar todos <Dialog> (rodar: grep -r "Dialog" components/)
- [ ] Listar patterns (create, edit, delete, confirm)
- [ ] Verificar header/body/footer compliance

Criar:
components/dialogs/
├── form-dialog.tsx (genérico para create/edit)
├── confirm-dialog.tsx (delete/cancel)
├── info-dialog.tsx (read-only)
└── sheet-dialog.tsx (mobile-friendly variant)

Padrão para FormDialog:
<FormDialog
  open={open}
  title="Add Transaction"
  onSubmit={handleSubmit}
  isLoading={isPending}
>
  <FormField label="Amount" ... />
</FormDialog>

Ganho: -200+ linhas dialogs, padrão em 15+ módulos
```

---

#### Dia 10-12: Card Components

**Status:** 🔴 Not Started

```bash
Audit:
- [ ] Procurar todos <div className="...border...bg-card">
- [ ] Documentar variações CSS (10-15 diferentes)

Criar:
components/ui/cards/
├── base-card.tsx (default, stat, highlight, action)
├── stat-card.tsx (número + label + trend)
├── item-card.tsx (com menu dropdown)
├── media-card.tsx (com imagem)
└── index.ts

Padrão:
<BaseCard variant="stat">
  <StatCard value={1234} label="Total" trend={+5.2} />
</BaseCard>

Aplicar em:
- Finance: TransactionCard, AccountCard, WishlistCard
- Health: WorkoutCard, MealCard, SleepCard
- Projects: ProjectCard, TaskCard
- Studies: SubjectCard, NoteCard

Ganho: -150+ linhas CSS/classe, padrão visual consistente
```

---

#### Dia 12-14: DataTable Component

**Status:** 🔴 Not Started

```bash
Criar:
components/data-table/
├── data-table.tsx (main)
├── use-sort.ts (hook)
├── use-filter.ts (hook)
├── use-pagination.ts (hook)
├── table-actions.tsx (edit/delete menu)
├── empty-state.tsx
├── loading-skeleton.tsx
└── index.ts

Padrão:
const { data, sort, setSort, filter, setFilter } = useDataTable(items);

<DataTable
  columns={columns}
  data={data}
  onSort={setSort}
  onFilter={setFilter}
  emptyState={<EmptyState />}
  loading={isLoading}
/>

Aplicar em:
- Transactions, Accounts, Recurring
- Projects, Tasks
- Studies, FlashCards
- Links, Workouts, Meals
- Social (Friends)

Ganho: -200+ linhas, padrão em 10+ páginas, melhor UX
```

---

### FASE 3: REORGANIZAÇÃO MODULAR (Semana 3: 15-21 Jun)

#### Dia 15-17: Estruturar components/ Finance

**Status:** 🔴 Not Started

```bash
HOJE:
components/finance/
├── account-dialog.tsx (200+ linhas)
├── finance-dashboard.tsx
├── finance-ui.tsx
├── recurring-dialog.tsx
├── transaction-dialog.tsx
├── wishlist/
│   ├── wishlist-card.tsx
│   └── wishlist-dialog.tsx
├── finance-overview.tsx
└── finance-dashboard-loader.tsx

REFATORADO:
components/finance/
├── index.ts (exports públicas)
├── account/
│   ├── account-dialog.tsx
│   ├── account-card.tsx
│   ├── account-form.tsx
│   ├── types.ts
│   ├── hooks.ts
│   └── constants.ts
├── transaction/
│   ├── transaction-dialog.tsx
│   ├── transaction-card.tsx
│   ├── transaction-form.tsx
│   ├── types.ts
│   └── hooks.ts
├── recurring/
│   ├── recurring-dialog.tsx
│   ├── recurring-card.tsx
│   └── types.ts
├── wishlist/
│   ├── wishlist-card.tsx
│   ├── wishlist-dialog.tsx
│   └── types.ts
├── overview/
│   ├── finance-overview.tsx
│   ├── finance-dashboard.tsx
│   └── charts.tsx
├── shared/
│   ├── hooks.ts (useAccounts, useTransactions, etc)
│   ├── types.ts (Transaction, Account types)
│   └── constants.ts (categories, statuses)
├── README.md
└── index.ts

Ganho: -300 linhas, estrutura clara, reutilizável
```

---

#### Dia 17-19: Estruturar components/ Health

**Status:** 🔴 Not Started

```bash
components/health/
├── index.ts
├── workout/
│   ├── workout-card.tsx
│   ├── workout-dialog.tsx
│   ├── workout-chart.tsx
│   └── types.ts
├── nutrition/
│   ├── meal-card.tsx
│   ├── meal-plan-dialog.tsx
│   ├── nutrition-chart.tsx
│   └── types.ts
├── sleep/
│   ├── sleep-card.tsx
│   ├── sleep-chart.tsx
│   └── types.ts
├── metrics/
│   ├── metric-card.tsx
│   └── metric-chart.tsx
├── shared/
│   ├── hooks.ts
│   ├── types.ts
│   └── constants.ts
├── README.md
└── index.ts

Ganho: -200+ linhas, padrão reutilizável
```

---

#### Dia 19-21: Padronizar Demais Módulos

**Status:** 🔴 Not Started

```bash
Projects:
components/projects/
├── project/
├── task/
├── shared/
└── README.md

Studies:
components/studies/
├── subject/
├── session/
├── note/
├── shared/
└── README.md

Social:
components/social/
├── friend/
├── contact/
├── shared/
└── README.md

+ Wardrobe, Entertainment, Agenda, Business, CMS, Links

Ganho: -500+ linhas, 100% padrão, documentado
```

---

### FASE 4: TYPE SYSTEM UNIFICADO (Semana 3.5-4: 22-28 Jun)

#### Dia 22-23: Consolidar lib/types/

**Status:** 🔴 Not Started

```bash
Criar:
lib/types/
├── index.ts (re-exports)
├── common.ts
│   ├── type Id = string & { readonly brand: "Id" }
│   ├── type UserId = string & { readonly brand: "UserId" }
│   ├── interface BaseEntity { id: Id; userId: UserId; createdAt: Date; updatedAt: Date }
│   ├── enum GlobalStatus { ACTIVE, ARCHIVED, DELETED }
│   └── interface ApiResponse<T> { data?: T; error?: { code: string; message: string; fields?: Record<string, string> } }
├── forms.ts
│   ├── interface FormState<T> { values: T; errors: Record<keyof T, string>; touched: Set<keyof T> }
│   ├── interface FormAction<T, R> { type: 'SET_VALUE' | 'SET_ERROR' | 'RESET' | 'SUBMIT'; payload: ... }
│   └── interface SubmitResult<T> { success: boolean; data?: T; errors?: Record<keyof T, string> }
├── ui.ts
│   ├── type Variant = 'default' | 'secondary' | 'destructive' | ...
│   ├── type Size = 'sm' | 'md' | 'lg'
│   └── interface ComponentBaseProps { className?: string; children?: React.ReactNode }
├── finance.ts (Transaction, Account, etc — type defs)
├── health.ts
├── projects.ts
├── studies.ts
└── ... (1 file por domínio)

Ganho: +type safety, -confusão, +DX
```

---

#### Dia 24-26: Consolidar lib/hooks/

**Status:** 🔴 Not Started

```bash
Criar:
lib/hooks/
├── index.ts
├── useForm.ts
│   export function useForm<T>(
│     initialValues: T,
│     onSubmit: (values: T) => Promise<void>,
│     validationSchema: ZodSchema
│   ): UseFormResult<T>
├── useList.ts
│   export function useList<T>(
│     fetcher: () => Promise<T[]>,
│     options?: { sort?, filter? }
│   ): UseListResult<T>
├── usePagination.ts
│   export function usePagination<T>(items: T[], pageSize: number): UsePaginationResult<T>
├── useSort.ts
│   export function useSort<T>(items: T[]): UseSortResult<T>
├── useFilter.ts
│   export function useFilter<T>(items: T[], schema: FilterSchema): UseFilterResult<T>
├── useMutation.ts (✅ já na FASE 1)
├── useAuth.ts
│   export function useAuth(): { userId: UserId; user: User | null; loading: boolean }
├── useLocalStorage.ts
├── useDebounce.ts
└── index.ts (re-exports públicas)

Ganho: -100+ linhas duplicadas, padrão em toda app
```

---

#### Dia 26-28: Consolidar lib/validation/

**Status:** 🔴 Not Started

```bash
lib/validation/
├── index.ts
├── schemas.ts (Zod exports)
├── messages.ts (mensagens de erro PT-BR)
├── helpers.ts (parseFormData, toApiFormat, etc)
└── constants.ts (regex patterns, limits, etc)

Exemplos:
export const createTransactionSchema = z.object({
  description: z.string().min(1, messages.required),
  amount: z.number().positive(messages.positive),
  date: z.coerce.date(),
  ...
});

Ganho: +reusability, -confusão com tipos
```

---

### FASE 5: PERFORMANCE & DOCS (Semana 5: 29-05 Jul)

#### Dia 29-30: Bundle Analysis & Lazy Imports

**Status:** 🔴 Not Started

```bash
1. npm run build -- --analyze
2. Identificar heavy packages:
   - Recharts (charts) → dynamic import
   - CodeMirror (ai/cms) → dynamic import
   - Pluggy (finance) → code-split

3. Add dynamic imports:
   const Charts = dynamic(() => import('@/components/charts'), { loading: () => <Skeleton /> });

Ganho: -15-20% bundle size
```

---

#### Dia 31-02: React DevTools Profiler

**Status:** 🔴 Not Started

```bash
1. npm run dev
2. Chrome: Profiler tab
3. Procurar componentes com slow renders
4. Add React.memo, useCallback onde necessário

Ganho: -wasted renders, melhor performance
```

---

#### Dia 03-05: README por Módulo

**Status:** 🔴 Not Started

```bash
Criar README.md em cada:
components/finance/README.md
components/health/README.md
components/projects/README.md
... (17 módulos)

Template:
# Finance Components

## Overview
[Descrição do módulo]

## Components Tree
- AccountCard
  - Props: { account, onSelect }
  - Features: [...]
- TransactionDialog
  - Props: { open, onSubmit }
  - Features: [...]

## Usage Example
```tsx
import { TransactionDialog } from '@/components/finance';
```

## Hooks
- useAccounts()
- useTransactions()

## Types
- type Transaction = ...
- interface Account { ... }

Ganho: +documentation, +DX, novo dev onboarding -50%
```

---

## 📊 CHECKLIST RÁPIDO

```markdown
SEMANA 1 (Quick Wins)
- [ ] Dia 1-2: Remove dialogs inline
- [ ] Dia 2-3: SubmitButton + ActionButton
- [ ] Dia 4-5: Consolidate Zod schemas
- [ ] Dia 5: useMutation hook

SEMANA 2 (Padrões)
- [ ] Dia 6-8: FormField genérico
- [ ] Dia 8-10: Dialog/Modal patterns
- [ ] Dia 10-12: Card components
- [ ] Dia 12-14: DataTable component

SEMANA 3 (Modularização)
- [ ] Dia 15-17: Finance refactor
- [ ] Dia 17-19: Health refactor
- [ ] Dia 19-21: Outros módulos

SEMANA 3.5-4 (Types & Hooks)
- [ ] Dia 22-23: lib/types/ consolidado
- [ ] Dia 24-26: lib/hooks/ consolidado
- [ ] Dia 26-28: lib/validation/ consolidado

SEMANA 5 (Performance & Docs)
- [ ] Dia 29-30: Bundle analysis + lazy imports
- [ ] Dia 31-02: Profiler optimization
- [ ] Dia 03-05: README por módulo
```

---

## 🎬 COMO COMEÇAR HOJE

```bash
# 1. Criar branches para cada fase
git checkout -b refactor/phase-1-quick-wins
git checkout -b refactor/phase-2-patterns
git checkout -b refactor/phase-3-modular

# 2. Começar com Dialog Inline Removal
grep -r "\.map.*Dialog" components/
# Listar arquivos afetados

# 3. Criar FormDialog genérico
# Criar SubmitButton
# Rodar tsc --noEmit (deve passar)

# 4. Commit por feature
git add components/ui/submit-button.tsx
git commit -m "feat: add submit button with loading state"

# 5. Criar PRs por fase
```

---

**IMPORTANTE:** Este roadmap é VIVO. Ajustar conforme learnings.

**Tempo Total Estimado:** 20-30 dias  
**ROI:** +50% maintainability, -30% bugs, +20% dev velocity

---

**Última atualização:** Jun 1, 2026  
**Responsável:** LuixzSouza  
**Status:** 🔴 Not Started
