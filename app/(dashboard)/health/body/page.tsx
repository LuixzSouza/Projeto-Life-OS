import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { User, ShieldCheck, RefreshCcw, ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BodyStats } from "@/lib/body-math";
import { HealthActions } from "@/components/health/health-actions";

export const metadata: Metadata = {
  title: "Composição Corporal | Life OS",
  description: "Acompanhamento de medidas, simetria e bioimpedância.",
};

export const dynamic = 'force-dynamic';

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let hasError = false;

  try {
    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      orderBy: { date: 'desc' },
    });

    if (latestMeasurement) {
      currentStats = {
        weight: latestMeasurement.weight,
        height: latestMeasurement.height,
        gender: (latestMeasurement.gender as 'MALE' | 'FEMALE') || 'MALE',
        activityFactor: latestMeasurement.activity || 1.2,
        
        // Conversão segura de data
        birthDate: latestMeasurement.birthDate 
            ? latestMeasurement.birthDate.toISOString().split('T')[0] 
            : undefined,
        
        // Medidas Essenciais
        neck: latestMeasurement.neck || 0,
        waist: latestMeasurement.waist || 0,
        hip: latestMeasurement.hip || 0,

        // Medidas Detalhadas
        shoulders: latestMeasurement.shoulders || 0,
        chest: latestMeasurement.chest || 0,
        armLeft: latestMeasurement.armLeft || 0,
        armRight: latestMeasurement.armRight || 0,
        forearmLeft: latestMeasurement.forearmLeft || 0,
        forearmRight: latestMeasurement.forearmRight || 0,
        thighLeft: latestMeasurement.thighLeft || 0,
        thighRight: latestMeasurement.thighRight || 0,
        calfLeft: latestMeasurement.calfLeft || 0,
        calfRight: latestMeasurement.calfRight || 0,
      };
    } else {
      // Estado inicial limpo
      currentStats = {
        weight: 0, height: 0, waist: 0, neck: 0, hip: 0,
        gender: 'MALE', activityFactor: 1.2
      };
    }

  } catch (error) {
    console.error("Erro ao carregar dados corporais:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/40 flex flex-col items-center gap-4 text-center max-w-md shadow-sm">
                <div className="h-16 w-16 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-full mb-2">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Falha de Leitura</h2>
                <p className="text-muted-foreground text-sm">
                    Não foi possível recuperar suas métricas corporais no momento.
                </p>
                <Link href="/health" className="mt-4">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <RefreshCcw className="h-4 w-4" /> Voltar
                    </Button>
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full pb-12">
        <div className="w-full p-6 md:p-8 space-y-8">
            
            {/* --- HEADER FULL-WIDTH --- */}
            <header className="flex flex-col gap-4 pb-6 border-b border-border/40">
                
                {/* 🟢 Botão de Voltar (Acima do título, discreto) */}
                <div>
                    <Link href="/health">
                        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                            Voltar para Overview
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    {/* Título e Ícone */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Composição Corporal</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Acompanhamento de medidas, proporções e simetria.
                            </p>
                        </div>
                    </div>

                    {/* Componente de Ações (Menu e Registro) */}
                    <div className="w-full xl:w-auto">
                        <HealthActions />
                    </div>
                </div>
            </header>

            {/* --- DASHBOARD PRINCIPAL --- */}
            <main className="animate-in fade-in duration-500">
                <BodyDashboard stats={currentStats!} />
            </main>
            
        </div>
    </div>
  );
}