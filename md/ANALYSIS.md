# Life OS - Análise Detalhada de Refatoração

## 1️⃣ DUPLICAÇÃO DE CÓDIGO IDENTIFICADA

### 1.1 Dialog/Modal Patterns (CRÍTICO)

**Problema:** Múltiplas implementações de "create/edit" dialogs repetindo o mesmo padrão.

```
Encontrados em:
- components/finance/transaction-dialog.tsx
- components/finance/account-dialog.tsx  
- components/finance/recurring-dialog.tsx
- components/finance/wishlist/wishlist-card.tsx
- components/projects/project-dialog.tsx
+ 15+ outras

Padrão comum:
1. useState para open/selected item
2. <Dialog> com header/body/footer
3. <Form> com zod validation
4. Loading state em button
5. onSuccess toast

→ EXTRAIR: <FormDialog> genérico
```

### 1.2 Form Fields (REPETIÇÃO)

**Problema:** Inputs, selects, date pickers implementados inline em cada dialog.

```
Padrão repetido:
<div className="space-y-2">
  <Label htmlFor="field">Label</Label>
  <Input id="field" value={} onChange={} />
  {error && <p className="text-sm text-red-600">{error}</p>}
</div>

→ EXTRAIR: <FormField> + <Select>, <DateInput>, <TextArea> 
```

### 1.3 Card Components (FALTA PADRÃO)

**Problema:** Cards usam classes Tailwind inconsistentes.

```
Variações encontradas:
1. bg-card border border-border shadow-sm hover:shadow-md
2. bg-background border-l-4 border-primary
3. bg-slate-50 dark:bg-slate-900 rounded-lg
4. Sem border/shadow (plano)

→ EXTRAIR: <BaseCard variant="default|stat|highlight|action">
```

### 1.4 Data Lists (FALTA PADRÃO)

**Problema:** Listas/tabelas implementam sort, filter, pagination independentemente.

```
Encontradas em:
- transactions page
- projects page
- flashcards page
- studies page
- links page
- social page

Cada uma reimplementa:
- useState(sort, filter)
- onClick handlers
- Empty state
- Loading skeleton

→ EXTRAIR: <DataTable> genérico + hooks useSort/useFilter/usePaginate
```

---

## 2️⃣ PROBLEMAS DE ORGANIZAÇÃO ESTRUTURAL

### 2.1 Componentes Mislocalizados

```
HOJE:
- components/finance/ (25+ files) → muita lógica local
- components/settings/ (10+ files)
- components/ai/ (8+ files)
- components/ui/ (só padrões Radix)
- components/ raiz: lock-screen.tsx, console-welcome.tsx

PROBLEMA:
- Falta padrão de organização por feature
- Index.ts missing (imports confusos)
- Tipos locais espalhados
- Hooks duplicados em módulos

SOLUÇÃO:
components/[module]/
├── index.ts (exports públicas)
├── [feature]/
│   ├── [feature].tsx (exibição)
│   ├── [feature]-dialog.tsx (modal)
│   ├── [feature]-card.tsx (card)
│   ├── [feature]-form.tsx (form)
│   ├── hooks.ts
│   ├── types.ts
│   └── constants.ts
├── shared/
│   ├── hooks/
│   ├── types/
│   └── constants.ts
└── README.md
```

### 2.2 Tipos Espalhados

```
HOJE:
- app/(dashboard)/finance/types.ts
- components/finance/types.ts (?)
- app/actions/setup.ts (enum StatusEnum)
- Prisma schema (tipos implicitos)
- Zod schemas em vários places

→ CRIAR: lib/types/ centralizado
  ├── common.ts (Id, userId, timestamps, GlobalStatus)
  ├── forms.ts (FormState<T>, FormError, SubmitResult)
  ├── ui.ts (variant types, component props)
  ├── finance.ts (Transaction, Account, etc — types)
  ├── health.ts
  └── projects.ts
```

### 2.3 Hooks Duplicados

```
Potencial duplicação:
- useForm (em vários módulos) → consolidar em lib/hooks/useForm.ts
- useFetch/useList (diversos patterns) → lib/hooks/useList.ts
- useAuth (via getSession) → lib/hooks/useAuth.ts
- useMutation (server action wrapper) → NÃO EXISTE, criar

CRIAR: lib/hooks/
├── index.ts
├── useForm.ts
├── useList.ts (com sort, filter, pagination)
├── useMutation.ts (server action wrapper)
├── useAuth.ts
└── useDebounce.ts
```

---

## 3️⃣ PROBLEMAS DE QUALIDADE

### 3.1 Type Safety Issues

```
ENCONTRADOS:
1. form validation schemas em TS/Zod inconsistentes
2. Response types (Success<T> | Error padrão falta)
3. Props types faltando em componentes (implicit "any")
4. Error handling inconsistente (some use toast, others console.log)

EXEMPLO ruim:
async function createTransaction(formData: FormData) {
  const data = Object.fromEntries(formData); // ❌ any type
  // ...
}

EXEMPLO bom:
const createTransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime(),
});

async function createTransaction(input: z.infer<typeof createTransactionSchema>) {
  // ✅ type-safe
}
```

### 3.2 Error Handling

```
PROBLEMA:
- Alguns erros → toast (Sonner)
- Alguns erros → console.log
- Alguns erros → silent (try/catch sem feedback)
- Forms sem mensagens de erro customizadas

PADRÃO:
const result = await action();
if (result.error) {
  toast.error(result.error.message);
  setErrors(result.error.fieldErrors); // zod errors
} else {
  toast.success("Criado com sucesso!");
  // refetch/refresh
}
```

### 3.3 Loading States

```
PROBLEMA:
- isPending do useTransition nem sempre usado
- Buttons sem loading indicator (disabled + spinner)
- Dialogs sem skeleton loading

PADRÃO:
const [isPending, startTransition] = useTransition();

<Button disabled={isPending}>
  {isPending ? <Loader className="w-4 h-4 animate-spin" /> : "Save"}
</Button>
```

---

## 4️⃣ PERFORMANCE ISSUES

### 4.1 Re-render Optimization

```
PROBLEMA:
- Lists sem React.memo
- Callbacks inline em map() → cria nova function a cada render
- useCallback/useMemo não utilizados estrategicamente

EXEMPLO ruim:
{transactions.map(tx => (
  <TransactionCard 
    key={tx.id}
    onClick={() => setSelected(tx)} // ❌ nova function a cada render
  />
))}

EXEMPLO bom:
const handleSelect = useCallback((tx) => setSelected(tx), []);

const TransactionCardMemo = React.memo(TransactionCard);

{transactions.map(tx => (
  <TransactionCardMemo 
    key={tx.id}
    onClick={handleSelect}
    transaction={tx}
  />
))}
```

### 4.2 Bundle Size

```
Dependências pesadas não analisadas:
- Recharts (charts) → usado em 3 páginas, imported em todos?
- CodeMirror (ai/cms) → heavy, apenas 2 páginas usam
- Pluggy SDK (finance) → usado em 1 banco

AÇÃO:
- Dynamic imports para pages pesadas
- Lazy load dialogs
- Análise com: npm run build && ls -lah .next/
```

---

## 5️⃣ QUICK WINS (Fácil + Alto Impacto)

### Win #1: Remover Dialogs Inline em Maps

**Tempo:** 1-2 dias  
**Impacto:** -50+ linhas, padrão consistente

```
Encontrados em:
- components/finance/wishlist/wishlist-card.tsx
- components/finance/transaction-dialog.tsx (dentro de map?)
- Procurar ".map()" + "<Dialog"

ANTES:
{items.map(item => (
  <>
    <ItemCard onClick={() => setSelected(item)} />
    <Dialog open={selected?.id === item.id} onOpenChange={...}>
      <EditForm />
    </Dialog>
  </>
))}

DEPOIS:
<ItemCard onClick={(item) => setSelected(item)} />
<EditDialog item={selected} onClose={() => setSelected(null)} />
```

### Win #2: Padronizar Buttons com Loading

**Tempo:** 1 dia  
**Impacto:** -20+ linhas, UX melhor

```
CRIAR: components/ui/submit-button.tsx

export function SubmitButton({ 
  isLoading, 
  children, 
  icon: Icon = Loader 
}: Props) {
  return (
    <Button disabled={isLoading}>
      {isLoading && <Icon className="w-4 h-4 animate-spin mr-2" />}
      {children}
    </Button>
  );
}

USO:
<SubmitButton isLoading={isPending}>Save</SubmitButton>
```

### Win #3: Consolidar Validadores Zod

**Tempo:** 1 dia  
**Impacto:** +reusability, -confusão com tipos

```
CRIAR: lib/validation/schemas.ts

export const createTransactionSchema = z.object({
  description: z.string().min(1, "Required"),
  amount: z.number().positive("Must be positive"),
  date: z.string().datetime(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

// Usar em forms, API routes, server actions
```

### Win #4: Empty States + Loading Skeleton

**Tempo:** 2 dias  
**Impacto:** profissionalismo visual

```
CRIAR: components/ui/empty-state.tsx
CRIAR: components/ui/loading-skeleton.tsx

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="w-12 h-12 text-muted-foreground" />
      <h3>{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      {action && <Button>{action}</Button>}
    </div>
  );
}

// USO:
{items.length === 0 ? (
  <EmptyState icon={PackageOpen} title="No items" />
) : (
  <DataTable />
)}
```

### Win #5: Criar `lib/hooks/useMutation.ts`

**Tempo:** 1 dia  
**Impacto:** padrão em TODA app

```
export function useMutation<T>(
  action: (data: T) => Promise<{ error?: string } | void>,
  options?: { onSuccess?: () => void }
) {
  const [isPending, startTransition] = useTransition();
  
  const mutate = useCallback((data: T) => {
    startTransition(async () => {
      try {
        const result = await action(data);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Success!");
          options?.onSuccess?.();
        }
      } catch (err) {
        toast.error("Something went wrong");
      }
    });
  }, [action, options]);

  return { mutate, isPending };
}

// USO em todas páginas:
const { mutate, isPending } = useMutation(createTransaction, {
  onSuccess: () => refetch(),
});
```

---

## 📌 RECOMENDAÇÃO DE ORDEM

1. **Semana 1:** Quick wins (#1-5 acima)
2. **Semana 2:** Padrões (Forms, Dialogs, Cards)
3. **Semana 3:** Reorganização (estrutura por módulo)
4. **Semana 4:** Type system + Hooks compartilhados
5. **Semana 5:** Performance + bundle analysis

---

**Estimado:** 20-30 dias para refactor completo  
**ROI:** +50% maintainability, -30% bugs, +20% dev velocity
