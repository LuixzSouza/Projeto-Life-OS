// components/landing/setup-guide.tsx
"use client";

import { Smartphone, Code, Database, Zap, ArrowRight, Server, Shield, Laptop, Terminal, GitBranch, Download, CheckCircle2, Copy, Play, X, ChevronLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import Link from "next/link";

// Tipagem dos passos
type SetupStepKey = 'intro' | 'prerequisites' | 'commands' | 'database' | 'run';

// Componente para o botão de comando com cópia
const CommandButton = ({ 
  command, 
  language, 
  description, 
  stepNumber 
}: { 
  command: string; 
  language: string; 
  description: string; 
  stepNumber?: number;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success("Comando copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Não foi possível copiar o comando.");
    }
  };

  return (
    <div className="space-y-3 pt-3 pb-5">
      {stepNumber && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 text-zinc-400 text-xs font-medium">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700 text-[10px]">
            {stepNumber}
          </span>
          Passo {stepNumber}
        </div>
      )}
      
      <p className="text-zinc-300 text-sm leading-relaxed">{description}</p>
      
      <div className="relative group">
        <code className={cn(
          "block w-full text-left p-4 rounded-xl bg-zinc-800/80 text-sm font-mono whitespace-pre-wrap break-all border border-white/10 hover:border-white/20 transition-colors",
          language === 'env' ? 'text-emerald-300/90' : 'text-cyan-300/90',
          "leading-relaxed"
        )}>
          {command}
        </code>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 p-2 rounded-lg bg-zinc-800/90 backdrop-blur-sm text-white/80 hover:bg-zinc-700 hover:text-white transition-all duration-200 shadow-lg hover:shadow-zinc-800/50"
          title={copied ? "Copiado!" : "Copiar comando"}
          aria-label={copied ? "Copiado" : "Copiar comando"}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        
        {/* Indicador de linguagem */}
        <div className={cn(
          "absolute left-3 -top-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
          language === 'env' 
            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50" 
            : "bg-cyan-900/30 text-cyan-400 border border-cyan-800/50"
        )}>
          {language === 'env' ? 'Variável de Ambiente' : 'Terminal'}
        </div>
      </div>
    </div>
  );
};

// Componente para o item de requisito
const RequirementItem = ({ 
  icon: Icon, 
  title, 
  description, 
  link, 
  linkText,
  isOptional = false 
}: { 
  icon: React.ElementType;
  title: string;
  description: React.ReactNode;
  link?: string;
  linkText?: string;
  isOptional?: boolean;
}) => (
  <li className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
    <div className={cn(
      "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg",
      isOptional ? "bg-zinc-800/50 text-zinc-400" : "bg-indigo-900/30 text-indigo-400"
    )}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-white">{title}</h4>
        {isOptional && (
          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full">
            Opcional
          </span>
        )}
      </div>
      <div className="text-zinc-400 text-sm leading-relaxed">
        {description}
      </div>
      {link && (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors group"
        >
          {linkText || "Saiba mais"}
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      )}
    </div>
  </li>
);

// Mapeamento dos passos
const STEPS: Record<SetupStepKey, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  content: React.ReactNode;
  progressLabel?: string;
}> = {
  intro: {
    title: "Configuração Local do Life OS",
    subtitle: "Guia interativo passo-a-passo para executar o sistema no seu computador",
    icon: Laptop,
    progressLabel: "Introdução",
    content: (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-800/30">
          <p className="text-zinc-300 leading-relaxed">
            O <span className="font-semibold text-white">Life OS</span> é um sistema operacional pessoal completo desenvolvido para operar 100% localmente. 
            Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento necessário.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/10 border border-red-800/30">
            <Shield className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Importante</h4>
              <p className="text-sm text-red-300/90">
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
        <p className="text-zinc-400 text-sm">
          Antes de começar, certifique-se de ter os seguintes programas instalados:
        </p>
        
        <ul className="space-y-3">
          <RequirementItem
            icon={Terminal}
            title="Node.js (v18 ou superior)"
            description={
              <>
                <p>Motor de execução JavaScript necessário para o Next.js</p>
                <p className="text-xs text-zinc-500 mt-1">Inclui o NPM (Node Package Manager)</p>
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
                <ul className="text-xs text-zinc-500 list-disc list-inside pl-2 space-y-1">
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
        
        <div className="mt-6 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
          <h4 className="font-semibold text-white text-sm mb-2">Verificação rápida</h4>
          <p className="text-sm text-zinc-400">
            Após instalar, abra seu terminal e execute:
          </p>
          <code className="block mt-2 p-3 rounded-lg bg-zinc-900 text-xs font-mono text-cyan-300">
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
        <p className="text-zinc-400 text-sm">
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
        
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-800/30">
          <h4 className="font-semibold text-white text-sm mb-2">Dica</h4>
          <p className="text-sm text-zinc-300">
            Se encontrar erros durante a instalação, certifique-se de estar usando a versão correta do Node.js (v18+). 
            Você pode verificar com <code className="text-cyan-300 text-xs">node --version</code>
          </p>
        </div>
      </div>
    )
  },
database: {
    title: "3. Configuração do Banco de Dados",
    subtitle: "Controle total sobre o armazenamento local dos seus dados (SQLite)",
    icon: Database,
    progressLabel: "Banco de Dados",
    content: (
        <div className="space-y-6">
            <p className="text-zinc-400 text-sm leading-relaxed">
                O Life OS armazena seus dados em um arquivo SQLite portátil. Você define onde esse arquivo (.db) deve ficar.
            </p>

            {/* Explicação da Configuração (Step 3.1) */}
            <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                <h4 className="font-semibold text-white text-base mb-3">1. Crie o arquivo <code className="text-emerald-300">.env</code></h4>
                <p className="text-sm text-zinc-400 mb-3">
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
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <h4 className="font-semibold text-white text-base mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
                    Armazenamento Opcional
                </h4>
                <p className="text-sm text-zinc-400 mb-3">
                    Você pode alterar o caminho para um HD externo ou uma pasta sincronizada com a nuvem (como Google Drive) **após o primeiro uso**.
                </p>
                
                <div className="space-y-2 text-sm">
                    <p className="text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        **Recomendação:** Use uma pasta sincronizada para ter backup automático.
                    </p>
                    <p className="text-zinc-300 flex items-center gap-2">
                        <Code className="h-4 w-4 text-indigo-400 shrink-0" />
                        **Exemplo de Caminho (Windows):** <code className="text-cyan-300">DATABASE_URL=&quot;file:D:/LifeOS_Data/life.db&quot;</code>
                    </p>
                </div>

                <p className="text-xs text-zinc-500 mt-3">
                    <span className="font-bold">Atenção:</span> Se alterar o caminho aqui, o Next.js precisará ser reiniciado. Você também poderá mudar este caminho diretamente na seção &quot;Configurações {'>'} Dados & Backup&quot; do sistema após o login.
                </p>
            </div>

            {/* Comando de Criação (Step 3.3) */}
            <h4 className="font-semibold text-white text-base pt-2">2. Crie o Banco e as Tabelas</h4>
            <CommandButton
                stepNumber={4}
                command="npx prisma db push"
                description="Este comando lê o arquivo .env e cria o arquivo life_os.db com a estrutura de tabelas."
                language="bash"
            />
            
            <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-800/30 mt-4">
                <h4 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    Privacidade Garantida
                </h4>
                <p className="text-sm text-emerald-300/90 leading-relaxed">
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
        
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-800/50 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-4">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Configuração Concluída!</h3>
          <p className="text-zinc-300 mb-4">
            O Life OS está pronto para ser executado localmente
          </p>
          
          <div className="inline-block p-4 rounded-xl bg-black/50 border border-white/10">
            <div className="text-sm text-zinc-400 mb-2">Acesse em:</div>
            <Link target="_blank" href={"http://localhost:3000"} className="text-2xl font-bold text-emerald-400 font-mono">
              http://localhost:3000
            </Link>
          </div>
          
          <p className="text-sm text-zinc-500 mt-6">
            Após acessar, você será redirecionado para o <strong>Assistente de Configuração Inicial</strong>
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
          <h4 className="font-semibold text-white text-sm mb-2">Comandos úteis para desenvolvimento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Para parar o servidor:</p>
              <code className="block p-2 rounded-lg bg-zinc-900 text-xs font-mono text-zinc-400">
                Ctrl + C
              </code>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Para reinstalar dependências:</p>
              <code className="block p-2 rounded-lg bg-zinc-900 text-xs font-mono text-zinc-400">
                npm ci
              </code>
            </div>
          </div>
        </div>
      </div>
    )
  }
};

// Ordem dos passos para navegação
const STEP_ORDER: SetupStepKey[] = ['intro', 'prerequisites', 'commands', 'database', 'run'];

export function SetupGuide() {
  const [currentStep, setCurrentStep] = useState<SetupStepKey>('intro');
  const stepData = STEPS[currentStep];
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  };

  const goToStep = (step: SetupStepKey) => {
    setCurrentStep(step);
  };

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 bg-[#050505] border-t border-white/5 relative overflow-hidden">
      
      {/* Background: Grid Tático com gradiente */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10 pointer-events-none" />
      
      {/* Gradientes de fundo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Centralizado */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-800/30 text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <Terminal className="h-3 w-3 text-indigo-400" /> 
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Setup Local Guiado
            </span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Configure em <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">5 minutos</span>
            <br />
            <span className="text-xl md:text-2xl text-zinc-400 font-normal">
              Guia interativo com comandos prontos para copiar
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            Siga este guia passo-a-passo para executar o Life OS localmente. 
            Cada comando pode ser copiado com um clique.
          </motion.p>
        </div>

        {/* Container Principal */}
        <div className="relative">
          
          {/* Indicador de Progresso */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-500">
                Passo {currentStepIndex + 1} de {STEP_ORDER.length}
              </div>
              <div className="text-sm font-medium text-white">
                {stepData.progressLabel}
              </div>
            </div>
            
            {/* Barra de Progresso */}
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / STEP_ORDER.length) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
            
            {/* Marcadores dos Passos */}
            <div className="flex justify-between mt-2">
              {STEP_ORDER.map((stepKey, index) => (
                <button
                  key={stepKey}
                  onClick={() => goToStep(stepKey)}
                  className={cn(
                    "flex flex-col items-center group",
                    "transition-all duration-300"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mb-2",
                    "transition-all duration-300",
                    stepKey === currentStep
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-110"
                      : index < currentStepIndex
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  )}>
                    {index + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    stepKey === currentStep
                      ? "text-white"
                      : index < currentStepIndex
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  )}>
                    {STEPS[stepKey].progressLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Card do Conteúdo */}
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative bg-gradient-to-b from-zinc-900/90 to-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden"
          >
            {/* Header do Card */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-black/50 to-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                  <stepData.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{stepData.title}</h3>
                  <p className="text-sm text-zinc-400">{stepData.subtitle}</p>
                </div>
                
                {/* Controles de Navegação */}
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevStep}
                      className="gap-2 text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                  
                  {currentStepIndex < STEP_ORDER.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                      className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => goToStep('intro')}
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      <Play className="h-4 w-4" />
                      Reiniciar Guia
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo do Passo */}
            <div className="p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                {stepData.content}
              </div>
            </div>

            {/* Footer do Card */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-zinc-500">
                  {currentStepIndex === STEP_ORDER.length - 1 ? (
                    "✨ Configuração completa! O sistema está pronto para uso."
                  ) : (
                    <>
                      <span className="text-zinc-400">Próximo:</span>{' '}
                      <span className="text-white font-medium">
                        {STEPS[STEP_ORDER[currentStepIndex + 1]].title}
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToStep('intro')}
                      className="text-zinc-400 hover:text-white border-zinc-700"
                    >
                      <Terminal className="h-3 w-3 mr-2" />
                      Início
                    </Button>
                  )}
                  
                  <a
                    href="https://github.com/LuixzSouza/Projeto-Life-OS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                  >
                    <GitBranch className="h-4 w-4" />
                    Ver Repositório
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Nota Informativa */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-white text-sm">💡 Dica Importante</h4>
                  <p className="text-sm text-zinc-400">
                    Encontrou problemas? Consulte a documentação completa no <Link href={"https://github.com/LuixzSouza/Projeto-Life-OS"} target="_blank" className="text-indigo-400 underline"> GitHub </Link> ou abra uma issue. 
                    Para dúvidas sobre Node.js ou Git, recomendamos os tutoriais oficiais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Exporta o componente principal
export default SetupGuide;