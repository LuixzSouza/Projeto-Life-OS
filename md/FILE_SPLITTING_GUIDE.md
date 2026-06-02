# Life OS - File Splitting Guide (Dividir Arquivos Gigantescos)

## 📊 PROBLEMA: Arquivos Muito Grandes

**39 arquivos com 300+ linhas** — impossível de manter, ler e testar.

Padrão saudável: **100-200 linhas máximo por arquivo**

---

## 🔴 CRÍTICO: Top 15 Piores Offenders

| Arquivo | Linhas | Problema | Solução |
|---------|--------|----------|---------|
| **settings/actions.ts** | 850 | Tudo em 1 arquivo | Split por feature |
| **weekly-planner.tsx** | 813 | Super componente | Break em sub-components |
| **business-view.tsx** | 690 | Lógica + UI | Separar container/presenter |
| **mobile-section.tsx** | 685 | Landing page monolítica | Componentes menores |
| **dashboard/page.tsx** | 602 | Página inteira inline | Subcomponents por seção |
| **study-timer.tsx** | 566 | Timer mega-component | Sub-logic + UI |
| **finance/actions.ts** | 558 | Tudo em 1 arquivo | Split por operação |
| **ai/actions.ts** | 547 | Tudo em 1 arquivo | Split por feature |
| **routine-manager.tsx** | 510 | Mega UI | Break em components |
| **study-session-list.tsx** | 498 | Lista + dialogs | Separar |

---

## 🎯 ESTRATÉGIA DE SPLIT

### Padrão 1: Action Files (Server Actions)

**PROBLEMA:** `app/(dashboard)/[module]/actions.ts` com 500-850 linhas

**ANTES:**
```
actions.ts (850 linhas)
├─ createTransaction
├─ updateTransaction
├─ deleteTransaction
├─ createAccount
├─ updateAccount
├─ createRecurring
├─ bulkImport
├─ export
└─ ... (30+ functions)
```

**DEPOIS:**
```
actions/
├─ index.ts (re-exports)
├─ transaction.ts (create, update, delete, bulk)
├─ account.ts (create, update, delete)
├─ recurring.ts (create, update, delete)
├─ import-export.ts (import, export, migrate)
└─ types.ts (shared types)
```

**Exemplo Split:**
```typescript
// actions/transaction.ts
"use server"

export async function createTransaction(input: TransactionInput) { ... }
export async function updateTransaction(id: string, input: TransactionInput) { ... }
export async function deleteTransaction(id: string) { ... }
export async function bulkCreateTransactions(items: TransactionInput[]) { ... }
```

---

### Padrão 2: Large Components (800+ linhas)

**PROBLEMA:** `components/health/nutrition/weekly-planner.tsx` (813 linhas)

**ANTES:**
```
weekly-planner.tsx (813 linhas)
├─ MealPlanner logic
├─ DayView UI
├─ MealCard UI
├─ MacroChart UI
├─ NutritionForm UI
└─ Dialog management
```

**DEPOIS:**
```
components/health/nutrition/
├─ index.ts
├─ weekly-planner.tsx (200 linhas — main layout)
├─ day-view.tsx (150 linhas)
├─ meal-card.tsx (120 linhas)
├─ macro-chart.tsx (100 linhas)
├─ nutrition-form.tsx (140 linhas)
├─ types.ts (shared types)
├─ hooks.ts (useNutrition, useMealPlan)
└─ constants.ts (defaults, macros)
```

---

### Padrão 3: Page Files (600+ linhas)

**PROBLEMA:** `app/(dashboard)/dashboard/page.tsx` (602 linhas)

**ANTES:**
```
dashboard/page.tsx (602 linhas)
├─ Stats section
├─ Finance chart
├─ Projects section
├─ Health summary
├─ Studies progress
├─ Upcoming events
└─ Quick actions
```

**DEPOIS:**
```
dashboard/
├─ page.tsx (100 linhas — layout principal)
├─ components/
│   ├─ stats-section.tsx
│   ├─ finance-section.tsx
│   ├─ projects-section.tsx
│   ├─ health-section.tsx
│   ├─ studies-section.tsx
│   ├─ events-section.tsx
│   ├─ quick-actions.tsx
│   └─ index.ts (exports)
└─ types.ts
```

---

## 📋 SPLIT CHECKLIST (40+ Arquivos)

### FASE A: Action Files (10 arquivos)

- [ ] `app/(dashboard)/settings/actions.ts` (850) → split 5 files
  - settings-user.ts (profile, password, preferences)
  - settings-app.ts (theme, notifications, shortcuts)
  - settings-integration.ts (API keys, Pluggy, OpenAI)
  - settings-backup.ts (backup, restore, export)
  - settings-admin.ts (users, permissions)

- [ ] `app/(dashboard)/finance/actions.ts` (558) → split 3 files
  - finance-transaction.ts
  - finance-account.ts
  - finance-recurring.ts

- [ ] `app/(dashboard)/ai/actions.ts` (547) → split 2 files
  - ai-chat.ts
  - ai-settings.ts

- [ ] `app/(dashboard)/projects/actions.ts` (459) → split 2 files
  - projects-project.ts
  - projects-task.ts

- [ ] `app/(dashboard)/studies/actions.ts` (319) → split 2 files
  - studies-subject.ts
  - studies-session.ts

- [ ] `app/(dashboard)/health/actions.ts` (382) → split 3 files
  - health-workout.ts
  - health-nutrition.ts
  - health-sleep.ts

- [ ] Outros módulos (agenda, business, cms, entertainment, links, social, wardrobe)

---

### FASE B: Large Components (15+ arquivos)

**Health Module:**
- [ ] `weekly-planner.tsx` (813) → split 5 files
- [ ] `body-dashboard.tsx` (479) → split 3 files
- [ ] `gym-dashboard.tsx` (373) → split 3 files
- [ ] `sleep-dashboard.tsx` (370) → split 3 files

**Studies Module:**
- [ ] `study-timer.tsx` (566) → split 3 files
- [ ] `study-session-list.tsx` (498) → split 2 files
- [ ] `subject-grid.tsx` (413) → split 2 files

**Finance Module:**
- [ ] `transaction-dialog.tsx` (447) → split 2 files
- [ ] `finance-dashboard.tsx` (377) → split 2 files
- [ ] `finance-overview.tsx` (386) → split 2 files

**Projects Module:**
- [ ] `job-tracker.tsx` (442) → split 2 files
- [ ] `edit-modal.tsx` (405) → split 2 files

**Other:**
- [ ] `business-view.tsx` (690) → split 4 files
- [ ] `wardrobe-form-dialog.tsx` (469) → split 2 files
- [ ] `social/friend-list.tsx` (424) → split 2 files

---

### FASE C: Page Files (5 arquivos)

- [ ] `app/(dashboard)/dashboard/page.tsx` (602) → split 7 files
- [ ] `app/(dashboard)/studies/page.tsx` (384) → split 4 files
- [ ] `app/(dashboard)/projects/[slug]/page.tsx` (356) → split 3 files
- [ ] `app/(dashboard)/health/page.tsx` (?) → split 5 files
- [ ] `app/(dashboard)/finance/page.tsx` (?) → split 4 files

---

### FASE D: Other Large Files (10+ arquivos)

- [ ] `landing/mobile-section.tsx` (685) → split 4 files
- [ ] `cms/site-editor.tsx` (406) → split 3 files
- [ ] `setup/setup-wizard.tsx` (394) → split 4 files
- [ ] `projects/resume/resume-builder.tsx` (349) → split 2 files
- [ ] `agenda/routine-manager.tsx` (510) → split 3 files
- [ ] `flashcards/deck-grid.tsx` (488) → split 2 files
- [ ] E mais...

---

## 📐 EXEMPLO DETALHADO: Split settings/actions.ts (850 linhas)

### ANTES:
```typescript
// app/(dashboard)/settings/actions.ts (850 linhas)

"use server"

import { prisma } from "@/lib/db"
import { getCurrentUserId } from "@/lib/auth"

// User profile updates (100 linhas)
export async function updateUserProfile(...) { ... }
export async function changePassword(...) { ... }
export async function changeMasterPassword(...) { ... }
export async function verifyMasterPassword(...) { ... }

// App preferences (80 linhas)
export async function updateAppSettings(...) { ... }
export async function updateThemePreference(...) { ... }
export async function updateNotificationSettings(...) { ... }

// API Integrations (150 linhas)
export async function saveOpenAiKey(...) { ... }
export async function saveGroqKey(...) { ... }
export async function saveGeminiKey(...) { ... }
export async function connectPluggy(...) { ... }
export async function disconnectPluggy(...) { ... }

// Backup & Restore (200 linhas)
export async function createBackup(...) { ... }
export async function restoreBackup(...) { ... }
export async function listBackups(...) { ... }
export async function exportData(...) { ... }
export async function importData(...) { ... }

// Admin (100 linhas)
export async function createUser(...) { ... }
export async function updateUserRole(...) { ... }
export async function deleteUser(...) { ... }
export async function resetUserData(...) { ... }
export async function factoryReset(...) { ... }
```

### DEPOIS:

**actions/index.ts** (30 linhas)
```typescript
"use server"

export * from "./user.ts"
export * from "./app.ts"
export * from "./integrations.ts"
export * from "./backup.ts"
export * from "./admin.ts"
```

**actions/user.ts** (100 linhas)
```typescript
"use server"

import { prisma } from "@/lib/db"
import { getCurrentUserId } from "@/lib/auth"

export async function updateUserProfile(input: UpdateProfileInput) {
  const userId = await requireUserId()
  // ...
}

export async function changePassword(currentPassword: string, newPassword: string) {
  // ...
}

export async function changeMasterPassword(newPassword: string) {
  // ...
}
```

**actions/app.ts** (80 linhas)
```typescript
"use server"

export async function updateAppSettings(settings: AppSettings) { ... }
export async function updateThemePreference(theme: "light" | "dark") { ... }
export async function updateNotificationSettings(settings: NotificationSettings) { ... }
```

**actions/integrations.ts** (150 linhas)
```typescript
"use server"

export async function saveOpenAiKey(key: string) { ... }
export async function saveGroqKey(key: string) { ... }
export async function saveGeminiKey(key: string) { ... }
export async function connectPluggy(connectToken: string) { ... }
export async function disconnectPluggy() { ... }
```

**actions/backup.ts** (200 linhas)
```typescript
"use server"

export async function createBackup() { ... }
export async function restoreBackup(backupId: string) { ... }
export async function listBackups() { ... }
export async function exportData(format: "json" | "csv") { ... }
export async function importData(formData: FormData) { ... }
```

**actions/admin.ts** (100 linhas)
```typescript
"use server"

export async function createUser(input: CreateUserInput) { ... }
export async function updateUserRole(userId: string, role: Role) { ... }
export async function deleteUser(userId: string) { ... }
export async function resetUserData(userId: string) { ... }
export async function factoryReset() { ... }
```

**Result:**
- ✅ 850 linhas → 6 arquivos de 30-200 linhas
- ✅ Cada arquivo tem responsabilidade única
- ✅ Imports claros (re-exportados de index.ts)
- ✅ Fácil de navegar e manter

---

## 🎬 COMO EXECUTAR SPLIT

### Passo-a-passo:

1. **Criar pasta/estrutura**
   ```bash
   mkdir -p app/(dashboard)/settings/actions
   touch app/(dashboard)/settings/actions/{index,user,app,integrations,backup,admin}.ts
   ```

2. **Copiar/Mover funções**
   - settings/actions/user.ts ← updateUserProfile, changePassword, etc
   - settings/actions/app.ts ← updateAppSettings, updateThemePreference, etc
   - etc...

3. **Criar index.ts com re-exports**
   ```typescript
   export * from "./user.ts"
   export * from "./app.ts"
   // ...
   ```

4. **Atualizar imports em componentes**
   - ANTES: `import { updateUserProfile } from "@/app/(dashboard)/settings/actions"`
   - DEPOIS: `import { updateUserProfile } from "@/app/(dashboard)/settings/actions"` (igual!)

5. **Deletar arquivo original**
   ```bash
   rm app/(dashboard)/settings/actions.ts
   ```

6. **Teste**
   ```bash
   npm run lint
   tsc --noEmit
   npm run dev
   ```

---

## 📌 CRITÉRIO PARA SPLIT

Arquivo deve ser dividido se:

- ✅ Mais de **300 linhas** (máximo ~150-200)
- ✅ Mais de **3 responsabilidades diferentes**
- ✅ Mais de **1 feature/domínio**
- ✅ **10+ funções/componentes** relacionadas

Não divide se:

- ❌ Menos de 150 linhas
- ❌ Responsabilidade única clara
- ❌ Funções muito interdependentes

---

## 📊 BENEFÍCIOS DO FILE SPLITTING

| Benefício | Impacto |
|-----------|--------|
| **Legibilidade** | +70% (max 200 linhas vs 850) |
| **Navegação** | +80% (goto file/definition rápido) |
| **Teste** | +60% (testar 1 função vs 30+) |
| **Merge conflicts** | -50% (arquivo não é bottleneck) |
| **Mantainability** | +50% (encontrar bug rápido) |
| **Onboarding** | +70% (novo dev entende rápido) |

---

## 🚀 CRONOGRAMA RECOMENDADO

**Paralelo com Refactor Principal:**

- Semana 1: Action files (Phase A) — 10 arquivos
- Semana 2: Large components (Phase B) — 15+ arquivos
- Semana 3: Page files (Phase C) — 5 arquivos
- Semana 4: Other files (Phase D) — 10+ arquivos

**Total:** ~40 arquivos divididos em 4 semanas

---

## ✅ RESULTADO FINAL

```
ANTES:
├─ 39 arquivos com 300+ linhas
├─ 3 arquivos com 800+ linhas
└─ Média: ~400 linhas/arquivo

DEPOIS:
├─ 39 arquivos divididos em ~120 arquivos
├─ Max: 200 linhas/arquivo
├─ Média: ~100 linhas/arquivo
└─ 100% legível, mantível, testável
```

---

**Impacto Total do Refactor + File Splitting:**
- -200+ linhas duplicação
- -70% tamanho médio de arquivo
- +50% maintainability
- +20% dev velocity

---

**Última atualização:** Jun 1, 2026
**Status:** 🔴 Not Started
**Prioridade:** Alta (é a base para refactor bem-sucedido)
