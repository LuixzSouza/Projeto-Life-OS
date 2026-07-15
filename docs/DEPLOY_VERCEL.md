# Deploy na Vercel (acesso de qualquer lugar, inclusive celular)

> Checklist para publicar uma instância do Life OS na nuvem apontando para o
> **mesmo** banco Turso que o seu PC usa no modo Híbrido. Assim o celular acessa
> os mesmos dados pelo link da Vercel.
>
> ⚠️ Faça **primeiro** a Etapa 2 (conectar o Híbrido no PC e enviar os dados ao
> Turso). Só depois publique aqui — senão o banco na nuvem fica vazio.

---

## 1. Variáveis de ambiente (Project → Settings → Environment Variables)

Configure **estas 5** na Vercel. Os valores você copia do seu `.env` local.

| Variável na Vercel | De onde copiar (seu `.env` local) | Observação |
|---|---|---|
| `TURSO_DATABASE_URL` | valor de **`TURSO_URL_REF`** | a URL `libsql://…` do seu Turso |
| `TURSO_AUTH_TOKEN` | valor de **`TURSO_TOKEN_REF`** | o token `eyJ…` |
| `ENCRYPTION_KEY` | valor de **`ENCRYPTION_KEY`** | **PRECISA ser idêntico ao local** (ver aviso abaixo) |
| `JWT_SECRET` | valor de **`JWT_SECRET`** | pode reusar o local ou gerar um novo forte |
| `DATABASE_URL` | `file:./prisma/life_os.db` (placeholder) | só para o `prisma generate` do build validar o schema; em runtime é ignorado (o `TURSO_DATABASE_URL` tem prioridade) |

> 🔑 **Por que `ENCRYPTION_KEY` tem que bater:** o PC e a Vercel compartilham o
> mesmo banco Turso. Os dados sensíveis (Cofre de Acessos, chaves de API salvas
> nas Configurações) são gravados **criptografados** com essa chave. Se a Vercel
> usar uma chave diferente, **não consegue descriptografar** o que o PC gravou
> (e vice-versa). Use exatamente o mesmo valor.

> ℹ️ **`JWT_SECRET`** assina o cookie de sessão. Não precisa ser igual ao do PC
> (você loga de novo no celular), mas precisa existir e ser forte. Reusar o local
> é o mais simples.

### Opcionais (só se quiser usar no celular)

| Variável | Para quê |
|---|---|
| `OPENAI_API_KEY` / `GROQ_API_KEY` / `GOOGLE_API_KEY` | IA (Cérebro Digital) na nuvem |
| `BRAPI_TOKEN` | cotações de ações (finanças) |
| `TMDB_API_KEY` / `RAWG_API_KEY` | capas de filmes/jogos (entretenimento) |
| `LIFEOS_REGISTRATION` | `off` para travar novos cadastros na instância pública |

> ⚠️ **`DATABASE_URL` é obrigatório na Vercel** — mas apenas como *placeholder*
> (`file:./prisma/life_os.db`). O `prisma generate` do build falha sem ele
> (`Environment variable not found: DATABASE_URL`). Em **runtime** ele é ignorado:
> o `getEnvProfile()` prioriza `TURSO_DATABASE_URL` (`libsql://…`) e só olha o
> `DATABASE_URL` se for um esquema remoto — `file:` nunca vira destino na nuvem.

---

## 2. Publicar

1. Faça _push_ do repositório para o GitHub (o branch que quiser publicar).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Framework: **Next.js** (detectado automaticamente). O `build` do projeto roda
   `prisma generate && next build` (o `prisma generate` exige `DATABASE_URL` no
   ambiente — por isso o placeholder da seção 1; nenhum `db push` roda no deploy).
4. Cole as variáveis da seção 1 → **Deploy**.

---

## 3. Primeiro acesso e login no celular

- Como o banco Turso **já tem seus dados e sua conta** (enviados na Etapa 2), o
  `/setup` reconhece o banco e te manda para o **`/login`**.
- No celular, abra o link da Vercel e entre com o **mesmo e-mail e senha** do PC.
- Pronto: PC e celular leem/escrevem no mesmo Turso. No PC, o modo Híbrido mantém
  a cópia local rápida e sincroniza automaticamente.

---

## 4. Conferência rápida (troubleshooting)

| Sintoma | Causa provável |
|---|---|
| `/setup` pede para criar conta de novo na Vercel | A Etapa 2 não rodou — o Turso está vazio. Conecte o Híbrido no PC primeiro. |
| Cofre/chaves aparecem corrompidos ou vazios na nuvem | `ENCRYPTION_KEY` da Vercel ≠ a do PC. Iguale os valores. |
| Erro 400 / token recusado no build ou em runtime | `TURSO_AUTH_TOKEN` errado (colou a URL no lugar do token, ou token de outro banco). |
| Build falha por falta de `JWT_SECRET`/`ENCRYPTION_KEY` | Variável obrigatória não definida na Vercel. |

Detalhes de arquitetura dos modos de banco: ver [`docs/DATABASE.md`](./DATABASE.md).
Guia geral de self-hosting: ver [`docs/SELF_HOSTING.md`](./SELF_HOSTING.md).
