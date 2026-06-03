"use client";

import Link from "next/link";
import { Laptop, Download, Terminal, GitBranch, Server, Database, Zap, Shield, ArrowRight, Code, CheckCircle2 } from "lucide-react";
import { CommandButton, RequirementItem } from "./setup-guide-atoms";
import type { SetupStepKey, StepData } from "./setup-guide-types";

// Mapeamento dos passos
export const STEPS: Record<SetupStepKey, StepData> = {
  intro: {
    title: "Configuração Local do Life OS",
    subtitle: "Guia interativo passo-a-passo para executar o sistema no seu computador",
    icon: Laptop,
    progressLabel: "Introdução",
    content: (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/20">
          <p className="text-foreground leading-relaxed">
            O <span className="font-semibold text-foreground">Life OS</span> é um sistema operacional pessoal completo desenvolvido para operar 100% localmente.
            Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento necessário.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-bold text-foreground text-sm">Importante</h4>
              <p className="text-sm text-red-600 dark:text-red-300/90">
                É necessário conhecimento básico de Terminal/Linha de Comando.
                Recomendamos que usuários inexperientes busquem tutoriais básicos antes de prosseguir.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  prerequisites: {
    title: "Pré-requisitos do Sistema",
    subtitle: "Verifique se possui os softwares essenciais instalados",
    icon: Download,
    progressLabel: "Pré-requisitos",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Antes de começar, certifique-se de ter os seguintes programas instalados:
        </p>

        <ul className="space-y-3">
          <RequirementItem
            icon={Terminal}
            title="Node.js (v18 ou superior)"
            description={
              <>
                <p>Motor de execução JavaScript necessário para o Next.js</p>
                <p className="text-xs text-muted-foreground mt-1">Inclui o NPM (Node Package Manager)</p>
              </>
            }
            link="https://nodejs.org/"
            linkText="Download oficial"
          />

          <RequirementItem
            icon={GitBranch}
            title="Git"
            description="Sistema de controle de versão para clonar o repositório"
            link="https://git-scm.com/downloads"
            linkText="Baixar Git"
          />

          <RequirementItem
            icon={Terminal}
            title="Terminal / Prompt de Comando"
            description={
              <div className="space-y-1">
                <p>Interface para executar comandos:</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 space-y-1">
                  <li><strong>Windows:</strong> PowerShell, CMD, ou Windows Terminal</li>
                  <li><strong>macOS:</strong> Terminal, iTerm2</li>
                  <li><strong>Linux:</strong> Terminal padrão da distribuição</li>
                </ul>
              </div>
            }
          />

          <RequirementItem
            icon={Server}
            title="Ollama (Opcional)"
            description="Para executar modelos de IA localmente (Llama 3, Mistral, etc.)"
            link="https://ollama.com/download"
            linkText="Download Ollama"
            isOptional
          />
        </ul>

        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
          <h4 className="font-semibold text-foreground text-sm mb-2">Verificação rápida</h4>
          <p className="text-sm text-muted-foreground">
            Após instalar, abra seu terminal e execute:
          </p>
          <code className="block mt-2 p-3 rounded-lg bg-card text-xs font-mono text-cyan-600 dark:text-cyan-300">
            node --version && git --version
          </code>
        </div>
      </div>
    )
  },
  commands: {
    title: "Comandos de Configuração",
    subtitle: "Execute no terminal, seguindo a ordem numérica",
    icon: Terminal,
    progressLabel: "Comandos",
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Abra o terminal na pasta onde deseja instalar o projeto e execute os comandos abaixo:
        </p>

        <CommandButton
          stepNumber={1}
          command="git clone https://github.com/LuixzSouza/Projeto-Life-OS.git"
          description="Clone o repositório do projeto para sua máquina local"
          language="bash"
        />

        <CommandButton
          stepNumber={2}
          command="cd Projeto-Life-OS"
          description="Entre na pasta do projeto recém-clonada"
          language="bash"
        />

        <CommandButton
          stepNumber={3}
          command="npm install"
          description="Instale todas as dependências (Next.js, Prisma, Tailwind, etc.)"
          language="bash"
        />

        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/10 border border-primary/20">
          <h4 className="font-semibold text-foreground text-sm mb-2">Dica</h4>
          <p className="text-sm text-foreground">
            Se encontrar erros durante a instalação, certifique-se de estar usando a versão correta do Node.js (v18+).
            Você pode verificar com <code className="text-cyan-600 dark:text-cyan-300 text-xs">node --version</code>
          </p>
        </div>
      </div>
    )
  },
  database: {
    title: "Configuração do Banco de Dados",
    subtitle: "Controle total sobre o armazenamento local dos seus dados (SQLite)",
    icon: Database,
    progressLabel: "Banco de Dados",
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm leading-relaxed">
          O Life OS armazena seus dados em um arquivo SQLite portátil. Você define onde esse arquivo (.db) deve ficar.
        </p>

        {/* Explicação da Configuração (Step 3.1) */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <h4 className="font-semibold text-foreground text-base mb-3">1. Crie o arquivo <code className="text-emerald-600 dark:text-emerald-300">.env</code></h4>
          <p className="text-sm text-muted-foreground mb-3">
            Insira este conteúdo na raiz do projeto. O caminho padrão salva o banco na pasta `prisma/`:
          </p>

          <CommandButton
            command={`# Arquivo .env (necessário)
DATABASE_URL="file:./prisma/life_os.db"

# Chaves de API opcionais (adicione para ativar integrações)
# TMDB_API_KEY="..."
# PLUGGY_CLIENT_ID="..."`}
            description="O `DATABASE_URL` aponta para o local onde seu arquivo de dados será criado."
            language="env"
          />
        </div>

        {/* Explicação sobre Armazenamento (Step 3.2 - Opcional, mas crucial) */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
          <h4 className="font-semibold text-foreground text-base mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            Armazenamento Opcional
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Você pode alterar o caminho para um HD externo ou uma pasta sincronizada com a nuvem (como Google Drive) <strong className="text-foreground">após o primeiro uso</strong>.
          </p>

          <div className="space-y-2 text-sm">
            <p className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span><strong>Recomendação:</strong> use uma pasta sincronizada para ter backup automático.</span>
            </p>
            <p className="text-foreground flex flex-wrap items-center gap-2">
              <Code className="h-4 w-4 text-primary dark:text-primary shrink-0" />
              <strong>Exemplo (Windows):</strong> <code className="text-cyan-600 dark:text-cyan-300">DATABASE_URL=&quot;file:D:/LifeOS_Data/life.db&quot;</code>
            </p>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            <span className="font-bold">Atenção:</span> Se alterar o caminho aqui, o Next.js precisará ser reiniciado. Você também poderá mudar este caminho diretamente na seção &quot;Configurações {'>'} Dados & Backup&quot; do sistema após o login.
          </p>
        </div>

        {/* Comando de Criação (Step 3.3) */}
        <h4 className="font-semibold text-foreground text-base pt-2">2. Crie o Banco e as Tabelas</h4>
        <CommandButton
          stepNumber={4}
          command="npx prisma db push"
          description="Este comando lê o arquivo .env e cria o arquivo life_os.db com a estrutura de tabelas."
          language="bash"
        />

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-4">
          <h4 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            Privacidade Garantida
          </h4>
          <p className="text-sm text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
            Seus dados nunca são enviados para a nuvem. O arquivo de banco de dados (`.db`) é seu e fica **apenas** no caminho que você definiu.
          </p>
        </div>
      </div>
    )
  },
  run: {
    title: "Inicialização do Sistema",
    subtitle: "Pronto para iniciar o Life OS localmente",
    icon: Zap,
    progressLabel: "Execução",
    content: (
      <div className="space-y-6">
        <CommandButton
          stepNumber={5}
          command="npm run dev"
          description="Inicia o servidor de desenvolvimento do Next.js"
          language="bash"
        />

        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/20 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-brand mb-4 shadow-lg shadow-primary/20">
            <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
          </div>

          <h3 className="text-xl font-bold text-foreground mb-2">Configuração Concluída!</h3>
          <p className="text-foreground mb-4">
            O Life OS está pronto para ser executado localmente
          </p>

          <div className="inline-block p-4 rounded-xl bg-background/50 border border-border">
            <div className="text-sm text-muted-foreground mb-2">Acesse em:</div>
            <Link target="_blank" href={"http://localhost:3000"} className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              http://localhost:3000
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Após acessar, você será redirecionado para o <strong>Assistente de Configuração Inicial</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <h4 className="font-semibold text-foreground text-sm mb-2">Comandos úteis para desenvolvimento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Para parar o servidor:</p>
              <code className="block p-2 rounded-lg bg-card text-xs font-mono text-muted-foreground">
                Ctrl + C
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Para reinstalar dependências:</p>
              <code className="block p-2 rounded-lg bg-card text-xs font-mono text-muted-foreground">
                npm ci
              </code>
            </div>
          </div>
        </div>
      </div>
    )
  }
};
