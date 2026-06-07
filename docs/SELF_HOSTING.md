# Life OS — Rode a sua própria instância

> Guia rápido para ter o **seu** Life OS, com o **seu** banco de dados.
> Filosofia do projeto: _local-first_ — cada pessoa é dona dos próprios dados.

## Por que rodar a sua própria instância?

O Life OS resolve a conexão de banco **por instância** (por processo), não por usuário.
Na prática:

- Quem usa uma instalação compartilha **o mesmo banco** dela (os dados ficam isolados
  por `userId`, mas residem no banco do dono daquela instância).
- Para ter um banco **100% seu** — onde o dado de mais ninguém toca o seu —, a forma
  recomendada é **rodar a sua própria instância** e apontá-la para o **seu** banco.

Isso é o "Modelo A" do projeto: zero custódia de credenciais de terceiros, privacidade
real, e cada um escolhe local, Turso próprio, etc.

---

## Opção 1 — Desktop (mais simples, 100% local)

Ideal para usar no seu PC, sem nuvem.

1. **Pré-requisitos:** [Node.js 20+](https://nodejs.org) e o repositório clonado.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o app:
   - **Windows (clicar e abrir):** dê dois cliques em **`Life OS.bat`**. O servidor sobe
     em segundo plano e o navegador abre sozinho. Para encerrar, use **`Fechar Life OS.bat`**.
   - **Qualquer SO (terminal):**
     ```bash
     npm run dev
     ```
4. No primeiro acesso você cai no **`/setup`**. Escolha o provedor **Local** e aponte uma
   pasta (ex.: `C:\LifeOS_Data`) — um arquivo `life_os.db` é criado ali. Esse arquivo é
   **só seu** e portável: pode mover/backupear quando quiser.

Pronto. Seus dados vivem nesse `.db` no seu computador.

---

## Opção 2 — Deploy próprio na nuvem (Vercel + Turso)

Ideal para acessar de qualquer lugar (inclusive celular) com **o seu** banco na nuvem.

### a) Crie o seu banco Turso (grátis)

1. Crie uma conta em [turso.tech](https://turso.tech) e um banco novo.
2. Pegue a **URL** (`libsql://seu-banco.turso.io`) e gere um **token**:
   ```bash
   turso db tokens create <nome-do-banco>
   ```
   > ⚠️ O token começa com `eyJ…` — não confunda com a URL.

### b) Faça o deploy na Vercel

1. _Fork_ deste repositório para a sua conta do GitHub.
2. Importe o fork na [Vercel](https://vercel.com) como um projeto Next.js.
3. Configure as **variáveis de ambiente** do projeto:

   | Variável | Valor | Obrigatória |
   |---|---|---|
   | `TURSO_DATABASE_URL` | a URL `libsql://…` do **seu** Turso | ✅ |
   | `TURSO_AUTH_TOKEN` | o token `eyJ…` do **seu** Turso | ✅ |
   | `JWT_SECRET` | segredo forte e aleatório (sessões) | ✅ |
   | `ENCRYPTION_KEY` | segredo forte e aleatório (cofre/cripto) | ✅ |
   | `LIFEOS_REGISTRATION` | `off` para travar novos cadastros (padrão: aberto) | opcional |

   > Quando `TURSO_*` está presente, o `/setup` **não pede** banco — o destino já vem do
   > ambiente, e o wizard só cria a sua conta admin.

4. Faça o deploy. No primeiro acesso, abra `/setup` e crie a sua conta admin.

### c) (Opcional) Híbrido PC + celular no mesmo Turso

Quer rapidez/offline no PC **e** acesso pelo celular ao mesmo dado? Use o modo
**`replica`** no desktop apontando para o **mesmo** Turso do deploy. Os detalhes da
topologia estão em **[`docs/DATABASE.md`](./DATABASE.md)**.

---

## Controlando quem entra (cadastros)

Por padrão a tela `/register` permite criar novas contas. Para uma instância pessoal,
você normalmente quer **fechar** isso depois de criar a sua conta:

- **Pela UI:** _Configurações → Segurança → Acesso ao Sistema_ → desligue
  **"Permitir novos cadastros"**.
- **Por ambiente (serverless):** defina `LIFEOS_REGISTRATION=off` (tem prioridade sobre a
  config em arquivo, útil em FS efêmero como a Vercel).

Com o cadastro fechado, `/register` recusa novas contas — só você (já cadastrado) acessa.

---

## Resumo

| Você quer… | Use |
|---|---|
| Tudo no meu PC, sem nuvem | **Opção 1 (Desktop, banco `local`)** |
| Acessar de qualquer lugar, banco só meu | **Opção 2 (Deploy próprio + meu Turso)** |
| PC offline + celular no mesmo dado | **Modo `replica`** (ver `docs/DATABASE.md`) |

Dúvidas de arquitetura de banco (modos `local` / `cloud` / `replica`, migrations,
portabilidade)? Veja **[`docs/DATABASE.md`](./DATABASE.md)**.
