# Life OS - AI Developer Guidelines

## 🎯 Project Overview
Life OS is a privacy-first, local-capable "Second Brain" operating system. It unifies Finances, Projects, Studies, Social CRM, Wardrobe, and Hybrid AI into a single platform.
**Core Philosophy:** 
1. **Privacy & Local-First:** No mandatory cloud. Data lives in a portable SQLite file that the user controls and can move via the UI.
2. **Frictionless UX:** Zero barriers to entry. Everything must be fast, beautiful, and require minimal user effort.
3. **Premium SaaS Design:** Clean interfaces, accessible components, and highly performant architecture.

## 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router & Server Actions)
- **Language:** TypeScript (Strict Mode)
- **Database:** SQLite + Prisma ORM
- **Auth:** `jose` (Stateless JWT with encrypted cookies)
- **Styling:** Tailwind CSS + Shadcn UI (Radix Primitives) + `cn()` utility
- **Animations & Charts:** Framer Motion + Recharts
- **Icons & Alerts:** Lucide React + Sonner
- **AI Engine:** Hybrid (Local via Ollama + Cloud via OpenAI/Groq/Gemini)

---

## 🛑 STRICT AI DIRECTIVES (READ BEFORE CODING)

### 1. Verification & Build Safety (Mandatory)
- **Rule:** Never suggest code that introduces TypeScript errors. DO NOT USE `any`. Define strict interfaces/types.
- **Rule:** If you add or modify a Prisma Model, you MUST remind the user to run `npx prisma generate` and `npx prisma db push` or `npx prisma migrate dev`.
- **Rule:** Vercel Build Compatibility: Always ensure the build script triggers `prisma generate && prisma db push` if testing cloud deployments, as Vercel caches outdated Prisma clients and lacks a persistent filesystem.

### 2. Architecture & Server Actions
- **Mutations:** All database mutations MUST be done via Server Actions with `"use server"` at the top.
- **Security:** EVERY Server Action MUST fetch the authenticated `userId` (via JWT) and use it in the `where` clause (e.g., `where: { id: itemId, userId: userId }`).
- **Prisma Updates/Deletes:** Always use `updateMany` and `deleteMany` when combining `id` and `userId` in the `where` clause to avoid Prisma composite key errors on non-unique fields.
- **Dates & Timezones:** When saving dates from HTML `<input type="date">`, always append `T12:00:00Z` before parsing with `new Date()` to prevent timezone shifts (the "previous day" bug).

### 3. Database & Portability (SQLite)
- Understand that the SQLite database file path (`DATABASE_URL`) can be changed dynamically by the user via the UI. Ensure any DB path operations respect `.env` dynamic configurations.
- Use **Base64 encoding** or local paths for image uploads (like Profile avatars and Wardrobe items) to keep the app portable without relying on AWS S3 or external buckets unless explicitly configured.

### 4. Frontend & Performance (React)
- **Modals in Lists:** NEVER put `<Dialog>` or `<AlertDialog>` inside a `.map()` loop. Use a single global modal controlled by state (e.g., `const [selectedItem, setSelectedItem] = useState(null)`).
- **Event Bubbling:** If placing buttons/dropdowns inside a clickable Card, ALWAYS use `e.stopPropagation()` on the inner buttons to prevent firing the Card's `onClick`.
- **Image Fallbacks (Frictionless UX):** Users shouldn't be forced to upload photos. Always provide a beautiful visual fallback using CSS background colors (`hex`), dynamic initials, or category icons with `mix-blend-overlay`.

### 5. Design System (Premium SaaS)
- **Headers:** Use `sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40` for main layout headers.
- **Cards:** Use subtle styling. Avoid heavy gradients or deep shadows. Use `bg-card border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all`.
- **Badges:** Use soft background colors with strong text (e.g., `bg-primary/10 text-primary border-none`).
- **Responsiveness:** Always ensure toolbars and tabs scroll horizontally (`overflow-x-auto scrollbar-hide`) on mobile. Ensure main layouts use `max-w-7xl mx-auto`.

---

## 💻 Useful Commands

- **Run Dev:** `npm run dev`
- **Lint Check:** `npm run lint`
- **Build:** `npm run build` *(Runs prisma generate & db push)*
- **Prisma Studio:** `npx prisma studio`
- **Prisma Migrations (Local):** `npx prisma migrate dev`

**End of Instructions.** Always prioritize elegant, privacy-respecting, and frictionless code.

VOCê TEM LIBERDADE PARA SER CRIATIVO NESSE SISTEMA APENAS TOMANDO CUIDADO PARA NÃO QUEBRAR PEDE TRAZER FUNCIONALIDADES NOVAS OU OQUE PREFERIR SENDO CRIATIVO UM SISTEMA BEM TIPADO SEM USO DE ANY SEMPRE VALIDANDO O LINT