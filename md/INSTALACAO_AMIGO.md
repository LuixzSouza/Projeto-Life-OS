# Life OS — guia de instalação (para amigos) 🚀

> Você recebeu o `LifeOS-Setup.exe`. Em ~3 minutos o sistema está rodando,
> **100% no seu computador** — seus dados não vão para nuvem nenhuma.

## Instalar (Windows 10/11)

1. **Dê dois cliques** em `LifeOS-Setup.exe`.
2. Se aparecer o aviso azul *"O Windows protegeu o seu PC"* (SmartScreen):
   clique em **Mais informações → Executar assim mesmo**. *(O aviso aparece
   porque o instalador não tem assinatura paga — o app é seguro e roda só na
   sua máquina.)*
3. Avance no instalador (recomendado: marcar **"Iniciar junto com o Windows"**).
4. Ao final, o Life OS abre sozinho no navegador → crie seu **usuário e senha**
   na tela de boas-vindas. Pronto!

## No dia a dia

- **Abrir:** atalho *Life OS* (área de trabalho ou menu Iniciar). Se já estiver
  aberto, ele só abre a janela de novo.
- **Fechar de verdade:** atalho *Fechar Life OS* (o X da janela não derruba o
  servidor — isso é proposital, para o celular continuar acessando).

## Usar no celular 📱

1. No PC: **Configurações → Dados & Sistema → Acesso Remoto**.
2. Clique em **"Liberar"** no Firewall (confirme a janela do Windows, 1 vez só).
3. Aponte a câmera do celular para o **QR code** (mesmo Wi‑Fi) e, no navegador,
   use *"Adicionar à tela inicial"* — vira um app de verdade.
4. Fora de casa? Siga o guia do **Tailscale** no mesmo painel (grátis e seguro).

## Onde ficam meus dados?

Em `%LOCALAPPDATA%\LifeOS\data` (banco, configurações e backups). Atualizar ou
até desinstalar o app **não apaga** essa pasta. O backup automático roda todo
dia — e em *Configurações → Snapshots* você pode apontar a pasta de backup para
o seu OneDrive/Drive.

## Atualizar

Instale a versão nova por cima — seus dados continuam onde estão. Antes de
copiar os arquivos, o instalador **fecha o servidor sozinho** e faz um
**backup automático** do seu banco em
`%LOCALAPPDATA%\LifeOS\data\backups\pre-update\` (rede de segurança extra).

Para saber quando sai versão nova: *Configurações → Dados & Sistema →
Status do Ambiente → Verificar* (quem te enviou o app configura o canal).

## Problemas comuns

| Sintoma | Solução |
|---|---|
| "Windows protegeu seu PC" | Mais informações → Executar assim mesmo |
| Antivírus reclama do `node.exe` | É o motor do app (Node.js oficial); adicione exceção |
| Celular não acessa | PC ligado? Mesmo Wi‑Fi? Firewall liberado (passo 2 acima)? |
| Esqueci a senha | Sem nuvem não há "recuperar senha" — guarde-a bem! |
