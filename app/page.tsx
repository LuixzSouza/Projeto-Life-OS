import { prisma } from "@/lib/prisma";
import { BootSequence } from "@/components/layout/boot-sequence";
import { headers } from "next/headers";

// Força a renderização dinâmica para garantir que o boot sempre rode
export const dynamic = 'force-dynamic';

export default async function BootScreen() {
  // 1. Verificação Real do Banco de Dados
  let dbStatus = "OFFLINE";
  let latency = 0;
  
  try {
    // eslint-disable-next-line react-hooks/purity
    const start = Date.now(); // Medição segura no Server Side
    await prisma.user.count(); 
    // eslint-disable-next-line react-hooks/purity
    latency = Date.now() - start;
    dbStatus = "ONLINE";
  } catch (error) {
    console.error("Database connection failed", error);
    dbStatus = "CRITICAL_ERROR";
  }

  // Gera um ID de sessão único
  // eslint-disable-next-line react-hooks/purity
  const sessionID = Math.random().toString(36).slice(2, 10).toUpperCase();
  
  // Pega o IP real ou simulado
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "127.0.0.1";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black text-green-500 font-mono overflow-hidden selection:bg-green-500/30 selection:text-green-200">
      
      {/* --- CAMADA 1: BACKGROUND TÁTICO --- */}
      
      {/* Grid de Fundo com Perspectiva */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00330020_1px,transparent_1px),linear-gradient(to_bottom,#00330020_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Vigneta (Bordas Escuras) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.95)_100%)] pointer-events-none" />

      {/* Scanlines (Efeito de Monitor Antigo) */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,6px_100%]" />

      {/* Ruído de Fundo (Noise Texture) */}
      <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      {/* --- CAMADA 2: TERMINAL CENTRAL --- */}
      
      <div className="relative z-30 flex flex-col items-center w-full max-w-2xl px-4">
        <BootSequence dbStatus={dbStatus} />
      </div>

      {/* --- CAMADA 3: HUD (Head-Up Display) / RODAPÉ --- */}
      <div className="fixed bottom-0 left-0 w-full z-40">
        {/* Linha decorativa superior */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-green-900/50 to-transparent" />
        
        <div className="flex justify-center items-center py-3 bg-black/80 backdrop-blur-md">
            <div className="flex items-center gap-6 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-green-700">
                
                {/* Status do Core */}
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${dbStatus === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse' : 'bg-red-500'}`} />
                    <span className={dbStatus === 'ONLINE' ? 'text-green-500' : 'text-red-500'}>CORE: {dbStatus}</span>
                </div>

                <span className="text-green-900/50 text-lg font-light">|</span>

                {/* Latência */}
                <div className="flex gap-2">
                    <span>LATENCY:</span>
                    <span className="text-green-400">{latency}ms</span>
                </div>
                
                <span className="text-green-900/50 text-lg font-light hidden sm:inline">|</span>

                {/* IP e Sessão (Escondido em mobile muito pequeno) */}
                <div className="hidden sm:flex gap-6">
                    <div className="flex gap-2">
                        <span>NET:</span>
                        <span className="text-green-400">{ip}</span>
                    </div>

                    <span className="text-green-900/50 text-lg font-light">|</span>

                    <div className="flex gap-2">
                        <span>SID:</span>
                        <span className="text-green-400">{sessionID}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </main>
  );
}