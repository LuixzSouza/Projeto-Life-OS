# Life OS — Plano de Distribuição (instalador para amigos)

> Criado em 10/jun/2026. Objetivo: amigos **baixam 1 arquivo, instalam em minutos e usam**
> — sem ver código-fonte, sem npm, sem terminal. Desktop primeiro; o celular deles entra
> pela camada de Acesso Remoto (QR/PWA) que cada instalação já carrega.

---

## 1. O que queremos (requisitos)

| # | Requisito | Observação |
|---|-----------|------------|
| R1 | Não compartilhar o código-fonte | Build minificado/compilado, sem o repositório |
| R2 | Download único e instalação rápida | 1 instalador `.exe`, próximo ao "duplo clique e pronto" |
| R3 | Tudo incluso | Node, banco, dependências nativas — o amigo não instala nada antes |
| R4 | Dados do amigo no PC dele | Cada instalação tem seu próprio SQLite local (privacidade) |
| R5 | Mobile depois do desktop | O celular do amigo acessa o desktop dele (painel Acesso Remoto/PWA) |
| R6 | Atualizável sem perder dados | Banco fica fora da pasta de instalação |

## 2. Opções avaliadas

### A) Instalador Windows (Inno Setup) + Next standalone + Node embutido ✅ RECOMENDADO (Fase 1)
- `next build` com `output: "standalone"` gera um servidor auto-contido e **minificado**
  (atende R1 — não é o código-fonte; é o mesmo nível de "fechado" de qualquer app Electron).
- Empacotamos junto um `node.exe` portátil (~50 MB) + binários nativos (Prisma engine, libsql).
- Inno Setup (gratuito) gera o `LifeOS-Setup.exe`: copia tudo, cria atalhos
  "Life OS" / "Fechar Life OS" (reusa a lógica do nosso launcher), abre o app no final.
- **Prós:** 100% na nossa stack (JS), reusa launcher e wizard `/setup` existentes, esforço baixo.
- **Contras:** instalador ~150–250 MB; aviso do SmartScreen por não ser assinado (ver §6).

### B) Tauri com sidecar (app de janela nativa) — Fase futura (polimento)
- O `src-tauri/` atual é um esqueleto apontando para `../out` (export estático) — **não funciona**
  com Server Actions/Prisma. O caminho certo seria: janela Tauri + servidor Next standalone
  rodando como *sidecar* (mesmo conteúdo da opção A, embrulhado num app nativo).
- **Prós:** instalador menor e mais bonito, ícone na barra, sensação de app de verdade.
- **Contras:** toolchain Rust, complexidade de sidecar/ciclo de vida, ganho pequeno sobre a
  opção A + navegador em modo app (que o launcher já faz com `--app=`).
- Decisão: **adiar**. A opção A entrega 90% do valor com 30% do esforço.

### C) Nuvem multi-usuário (link da Vercel + /register) — complemento, não substituto
- Já funciona hoje: mandar o link da instância Vercel, o amigo cria conta em `/register`,
  dados isolados por `userId`.
- **Prós:** zero instalação — bom como "experimenta antes de instalar".
- **Contras:** dados na SUA infra (Turso/Vercel), custo e responsabilidade seus; fere o
  espírito local-first para uso sério.

### D) Docker — descartado (amigo leigo + Windows Home = atrito demais).

## 3. Arquitetura da distribuição (opção A)

```
LifeOS-Setup.exe  (Inno Setup)
 └─ instala em %LOCALAPPDATA%\LifeOS\app\     ← sem precisar de admin
     ├─ node\node.exe                          ← runtime portátil embutido
     ├─ server\                                ← .next/standalone (minificado)
     │   ├─ server.js, .next/static, public/
     │   └─ node_modules mínimos + engines nativas (Prisma, libsql)
     ├─ launcher.mjs / stop.mjs                ← adaptação do scripts/launch.mjs (sem rebuild)
     └─ baseline.sql                           ← p/ ensureSchema criar o banco no 1º uso

Dados do amigo (sobrevivem a updates/desinstalação):
 %LOCALAPPDATA%\LifeOS\data\
     ├─ life_os.db                             ← SQLite dele
     ├─ life-os-config.json                    ← perfil de banco
     └─ backups\                               ← snapshots
```

Primeiro uso: atalho → launcher sobe o servidor → navegador abre em `/setup`
(o wizard de primeira conta **já existe**) → amigo cria usuário e senha → pronto.
Celular do amigo: Configurações → Acesso Remoto (QR na rede Wi‑Fi dele / Tailscale).

## 4. Plano de execução

### Fase 0 — Preparar o app para rodar "instalado" (pré-requisitos)
- [x] `next.config.ts`: `output: "standalone"` OPT-IN via env `LIFE_OS_STANDALONE=1` (não muda
      o fluxo pessoal); o dist script da Fase 1 deve copiar os nativos externalizados
      (libsql/Prisma engine) p/ o bundle. *(11/jun/2026)*
- [x] **Diretório de dados configurável**: env `LIFE_OS_DATA_DIR` em `lib/db-config.ts`
      (`getDataDir()`, fallback cwd — retrocompatível); config passa a morar lá. *(11/jun/2026)*
- [x] Smoke test: build standalone → `dist/app/server/server.js` com `LIFE_OS_DATA_DIR`
      em %TEMP% — servidor sobe, detecta instalação vazia e serve o /setup (HTTP 200);
      nativos carregaram. Falta só o fluxo manual completo (criar conta → tarefa →
      backup) no teste de PC limpo da Fase 1. *(11/jun/2026)*
- [x] Versão visível: `version` do package.json no card "Status do Ambiente" (Configurações
      → Dados & Sistema). *(11/jun/2026)*

### Fase 1 — Gerar o instalador (MVP distribuível)
- [x] `scripts/dist.mjs`: build standalone → monta `dist/app/` (server + static + public +
      nativos libsql/Prisma + baseline.sql + node portátil copiado do runtime atual +
      launcher/stop adaptados + .bat de conveniência). `npm run dist`. *(11/jun/2026)*
- [x] Launcher adaptado p/ modo instalado: `scripts/installed-launcher.mjs` (sem rebuild,
      porta livre 3000..3011, detecção de já-aberto, HOSTNAME 0.0.0.0 p/ celular, dados em
      LIFE_OS_DATA_DIR, navegador em modo app) + `installed-stop.mjs`. *(11/jun/2026)*
- [x] Script Inno Setup (`installer/lifeos.iss`): instala em `%LOCALAPPDATA%\LifeOS\app`
      sem admin, atalhos abrir/fechar + desktop, opção "iniciar com o Windows" (--no-open),
      pt-BR, dados preservados na desinstalação. Firewall fica com o botão do painel
      Acesso Remoto (UAC na hora certa). *(11/jun/2026)*
- [x] **Rodar `npm run dist`** + compilar o .iss → `release/LifeOS-Setup.exe` (337 MB;
      Inno Setup 6.7.3 instalado via winget; dist.mjs ganhou `dereference: true` — copiar
      symlink do standalone dá EPERM sem admin no Windows). Pacote inclui baseline.postgres
      + deps do pg. Smoke test: server.js da pasta empacotada subiu com `LIFE_OS_DATA_DIR`
      temporário e serviu o /setup (200). *(11/jun/2026)*
      *Otimização futura: ~1,3 GB descomprimido — dá p/ podar prebuilds de outras
      plataformas do libsql/engines.*
- [ ] **Testar num PC que não é o seu** (ou numa conta Windows limpa) — teste real de amigo.
- [x] `md/INSTALACAO_AMIGO.md`: guia pronto (instalar, SmartScreen, celular, dados,
      atualização, problemas comuns). *(11/jun/2026)*

### Fase 2 — Ciclo de vida
- [x] Atualização manual v1: instalar por cima (dados ficam em `data\`) — documentado em
      `md/INSTALACAO_AMIGO.md`; o instalador agora PARA o servidor antes de copiar.
      *(11/jun/2026 — falta o teste real de update v1→v2)*
- [x] Checagem de versão: action `checkForUpdates` (settings/actions/update.ts) lê
      `LIFE_OS_UPDATE_URL` (latest.json próprio `{version,url,notes}` OU GitHub Releases
      `releases/latest`) + widget discreto no card "Status do Ambiente" (opt-in, sem rede
      automática). *(11/jun/2026)*
- [x] Canal de entrega — **decisão**: GitHub Releases (repo privado serve: release pública
      expõe só o binário, código segue fechado; alternativa: link do Drive). Apontar
      `LIFE_OS_UPDATE_URL=https://api.github.com/repos/<dono>/<repo>/releases/latest`
      na instância de cada amigo (ou embutir no .env do pacote). *(11/jun/2026)*
- [x] Backup automático antes de atualizar — `[Code]` no lifeos.iss: para o servidor e
      copia `life_os*.db` + config para `data\backups\pre-update\v<versão>-<data>`.
      *(11/jun/2026)*

### Fase 3 — Polimento (opcional)
- [ ] Tauri sidecar (janela nativa, bandeja do sistema) se a experiência navegador incomodar.
- [ ] Assinatura de código (certificado pago ~US$100+/ano) p/ eliminar o aviso SmartScreen.
- [ ] Auto-update de verdade (baixa e aplica sozinho).

## 5. Decisões já tomadas
- **Desktop primeiro**; mobile do amigo = PWA apontando para o desktop dele (Acesso Remoto).
- **Instala por usuário** (`%LOCALAPPDATA%`, sem admin) — menos atrito e menos SmartScreen.
- **Dados separados do app** (R6) — update nunca toca em `data\`.
- **Cada amigo = ilha**: sem servidor central; se quiserem sync próprio, cada um pode criar
  o SEU Turso grátis pelo wizard Híbrido (mesmo fluxo que você usa).

## 6. Riscos & como mitigar
| Risco | Mitigação |
|-------|-----------|
| SmartScreen "Windows protegeu seu PC" (exe não assinado) | Guia com print ("Mais informações → Executar assim mesmo"); Fase 3: assinar |
| Antivírus implicar com node.exe embutido | Instalar em LOCALAPPDATA por usuário; orientar exceção se preciso |
| Binários nativos fora do bundle (Prisma/libsql) | Smoke test da Fase 0 pega isso antes do instalador |
| Amigo esquecer o PC desligado e "não funciona no celular" | Painel Acesso Remoto já explica; opção "iniciar com o Windows" no instalador |
| Update quebrar schema antigo | `ensureSchema` reconcilia colunas aditivamente (já existe p/ Turso; garantir no SQLite local) |
| Tamanho do download (~200 MB) | Aceitável p/ desktop; comunicar no guia |

## 7. Próximo passo concreto
Fase 0 inteira numa sessão: `output: "standalone"` + `LIFE_OS_DATA_DIR` + smoke test.
É pré-requisito de tudo e já valida os riscos técnicos (binários nativos) sem encostar
no instalador.
