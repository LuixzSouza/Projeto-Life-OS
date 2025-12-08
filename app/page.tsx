import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Terminal, Cpu } from "lucide-react";

export default async function BootScreen() {
  // Verificação Real do Banco de Dados
  let dbStatus = "offline";
  try {
    await prisma.user.findMany(); // Teste de conexão
    dbStatus = "online";
  } catch (error) {
    dbStatus = "error";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-mono selection:bg-green-900">
      
      {/* Container Central com estilo Retro-Futurista */}
      <div className="w-full max-w-md space-y-8 p-8 border border-zinc-800 rounded-lg bg-zinc-900/50 shadow-2xl backdrop-blur-sm">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse delay-75" />
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse delay-150" />
          <span className="ml-auto text-xs text-zinc-500">v1.0.0</span>
        </div>

        {/* Log do Sistema */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">Life OS</h1>
              <p className="text-xs text-zinc-400">Personal Operating System</p>
            </div>
          </div>

          <div className="space-y-2 py-4 text-sm font-mono">
            <div className="flex items-center justify-between text-green-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Core Modules
              </span>
              <span>[OK]</span>
            </div>
            <div className="flex items-center justify-between text-green-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Interface
              </span>
              <span>[OK]</span>
            </div>
            
            {/* Status Real do Banco */}
            <div className={`flex items-center justify-between ${dbStatus === 'online' ? 'text-green-400' : 'text-red-500'}`}>
              <span className="flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Database Connection
              </span>
              <span>[{dbStatus.toUpperCase()}]</span>
            </div>
          </div>
        </div>

        {/* Ação de Entrada */}
        <div className="pt-4 border-t border-zinc-800">
            {dbStatus === 'online' ? (
                <Link href="/dashboard" className="w-full">
                    <Button className="w-full bg-white text-black hover:bg-zinc-200 transition-all duration-300 group">
                        Inicializar Sistema
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Link>
            ) : (
                <Button variant="destructive" className="w-full cursor-not-allowed">
                    Sistema Indisponível (Erro DB)
                </Button>
            )}
        </div>
      </div>

      <p className="fixed bottom-8 text-xs text-zinc-600">
        Secure Environment • Localhost Access Only
      </p>
    </main>
  );
}