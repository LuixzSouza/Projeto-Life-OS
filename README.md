# 🌟 Life OS: Sistema de Gestão Pessoal

![Badge - Status: Em Desenvolvimento](https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue)
![Badge - Tech Stack](https://img.shields.io/badge/Tech-Next.js%20%7C%20Prisma%20%7C%20Tailwind-informational)

## Visão Geral

O **Life OS** é um painel de controle pessoal (Personal Operating System) construído para centralizar as áreas de **Produtividade**, **Finanças**, **Agenda** e **Trabalho** em um único local. O foco principal é a performance (Next.js Server Actions) e a privacidade (local-first / Ollama).

Este projeto é resultado de um desenvolvimento passo a passo visando criar um ambiente digital altamente customizado.

## ✨ Funcionalidades Principais

| Módulo | Funcionalidades |
| :--- | :--- |
| **Projetos & Tarefas** | Gestão de tarefas por projetos com prioridade, datas e status. Suporte a anexos de imagem (via Ctrl+V) na criação/edição. |
| **Kanban de Vagas** | Rastreamento visual de candidaturas de emprego (Kanban View) com status, link da vaga e notas/requisitos detalhados. |
| **Agenda** | Calendário de compromissos com agrupamento por dia ("Hoje", "Amanhã") e integração visual com tarefas pendentes para foco diário. |
| **Finanças (Base)** | Rastreamento de Contas e Transações. Dashboard com saldo total e fluxo de caixa. |
| **CMS Headless** | Gestor de conteúdo JSON para sites externos, com API Key e edição de páginas dinâmicas. |
| **IA Local** | Interface de chat integrada para uso de LLMs locais via Ollama (sem limites de token/custo). |
| **Configurações** | Controle de Dark Mode, Perfil e Configurações do Provedor de IA. |

## 🚀 Tecnologias Utilizadas

* **Framework:** Next.js (App Router, Server Actions)
* **Linguagem:** TypeScript
* **Estilização:** Tailwind CSS (Shadcn/UI)
* **Banco de Dados:** Prisma ORM (Configurado para MySQL, mas compatível com SQLite)
* **Gráficos:** Recharts
* **IA:** Ollama (Integração Local)
* **Utils:** `date-fns`, `sonner` (Toast Notifications)

## 🛠️ Pré-requisitos

Para rodar o Life OS, você precisa ter:

1.  **Node.js** (versão 18+)
2.  **npm** ou **yarn**
3.  **MySQL** (Rodando localmente ou via Docker)
4.  **(Opcional) Ollama:** Instalado localmente para rodar o módulo de Chat IA.

## ⚙️ Instalação e Execução

Siga os passos abaixo para configurar o ambiente.

### 1. Clonar e Instalar Dependências

```bash
# Substitua pelo seu link
git clone [SEU REPOSITÓRIO AQUI]
cd life-os
npm install
2. Configurar o Ambiente
Crie um arquivo .env na raiz do projeto (baseado em um env.example se você tiver) e preencha a string de conexão:

DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/life_os?schema=public"
3. Inicializar o Banco de Dados
Aplique as migrações que criamos. Este comando cria todas as tabelas (Project, Task, Event, JobApplication, etc.) e gera o Prisma Client:

Bash

npx prisma migrate dev --name init_life_os_full_setup
npx prisma generate
4. Rodar o Servidor
Inicie o projeto em modo de desenvolvimento:

Bash

npm run dev
O sistema estará acessível em http://localhost:3000.