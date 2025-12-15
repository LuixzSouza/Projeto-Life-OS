🌌 Life OS: Seu Segundo Cérebro Digital
Gerencie Finanças, Projetos, Estudos e IA em uma única plataforma local. Sem assinaturas, sem nuvem obrigatória, privacidade total.

📖 Visão Geral
O Life OS é um sistema operacional pessoal projetado para rodar localmente no seu computador. Diferente de ferramentas SaaS tradicionais (Notion, Trello, Mint), o Life OS prioriza a privacidade e a velocidade.

Todos os dados são salvos em um arquivo SQLite que você controla. Você pode mover o banco de dados para um HD externo, Pen Drive ou pasta segura diretamente pela interface do sistema.

🌟 Destaques da Versão Atual
Landing Page Premium: Apresentação visual do sistema.

Setup Wizard: Assistente de configuração inicial (Perfil, Tema, IA).

Autenticação JWT: Sistema de login seguro com cookies criptografados.

Armazenamento Dinâmico: Escolha onde salvar seus dados (ex: G:/MeusDados/life.db) via interface visual.

✨ Funcionalidades Principais
🧠 Inteligência Artificial Híbrida
Converse com seus dados. O sistema suporta múltiplos provedores:

Local (Privacidade Máxima): Integração nativa com Ollama (Llama 3, Mistral, etc).

Nuvem (Alta Performance): Suporte para OpenAI (GPT-4), Groq (Llama 3.3 Ultra-rápido) e Google Gemini.

Context Aware: A IA pode ler seus dados (tarefas, finanças) para dar conselhos contextualizados.

💰 Controle Financeiro
Gestão de Contas: Carteira, Bancos, Investimentos.

Transações: Receitas e Despesas com categorização.

Dashboard: Gráficos de fluxo de caixa e cálculo automático de patrimônio líquido.

🚀 Produtividade & Projetos
Projetos: Gestão de grandes objetivos com status e prazos.

Tarefas: Listas de afazeres vinculadas a projetos.

Agenda: Visualização dos próximos compromissos.

📚 Study Engine (Motor de Estudos)
Sessões de Foco: Registre tempo de estudo por matéria.

Flashcards: (Em breve) Sistema de repetição espaçada.

Análise: Gráficos de distribuição de foco.

🎨 Personalização & Sistema
Temas: Claro, Escuro e Sistema.

Cores de Destaque: 6 opções de cores (Zinc, Blue, Violet, Rose, Orange, Green).

Perfil: Foto de perfil (com upload local em Base64) e Capa personalizada.

🛠️ Stack Tecnológico
O projeto foi construído com as tecnologias mais modernas do ecossistema React:

Framework: Next.js 15 (App Router & Server Actions)

Database: SQLite + Prisma ORM (Arquivo .db portátil)

Styling: Tailwind CSS + Shadcn/UI (Radix Primitives)

Auth: jose (JWT Stateless)

Animações: Framer Motion

Gráficos: Recharts

Utils: sonner (Toasts), lucide-react (Ícones), next-themes.

🚀 Como Rodar o Projeto (Passo a Passo)
Siga este guia para instalar o Life OS no seu computador.

1. Pré-requisitos
Node.js (Versão 18 ou superior).

(Opcional) Ollama instalado se quiser usar IA local.

2. Clonar e Instalar
Bash

git clone [URL_DO_SEU_REPOSITORIO]
cd life-os
npm install
3. Configurar o Banco de Dados
Crie um arquivo .env na raiz do projeto. Como usamos SQLite, a configuração é simples:

Snippet de código

# Define o local inicial do banco de dados.
# Use barras normais (/) mesmo no Windows.
DATABASE_URL="file:./prisma/life_os.db"
4. Criar as Tabelas (Migração)
Execute o comando para criar o arquivo do banco de dados e as tabelas:

Bash

npx prisma migrate dev --name init_sqlite
5. Iniciar o Sistema
Bash

npm run dev
Acesse http://localhost:3000 no seu navegador.

🧭 Guia de Primeiro Uso
Landing Page: Você verá a tela inicial. Clique em "Começar Agora".

Setup Wizard:

Defina seu Nome e Bio.

Escolha seu provedor de IA preferido.

Defina o Tema e a Moeda.

Dashboard: Após o setup, você será redirecionado para o painel principal.

Tour Guiado: Um tutorial interativo apresentará os módulos.

💾 Como Mudar o Local do Banco de Dados?
Se você quiser salvar seus dados em um HD Externo ou outra partição (ex: Disco D:):

Vá em Configurações > Dados & Armazenamento.

No campo "Localização do Banco", clique no ícone de pasta 📂.

Navegue pelas pastas do seu PC e selecione o destino.

Clique em Mover Banco de Dados.

O sistema copiará automaticamente seus dados atuais para o novo local e atualizará a configuração.

🤝 Contribuição
Este é um projeto pessoal open-source. Sinta-se à vontade para abrir Issues ou Pull Requests para melhorar funcionalidades ou corrigir bugs.

📄 Licença
Este projeto está sob a licença MIT. Você é livre para usar, modificar e distribuir.

<p align="center"> Feito com 💜 para produtividade máxima. </p>

npx prisma generate

npx prisma db push