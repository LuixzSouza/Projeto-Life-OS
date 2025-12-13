// app/page.tsx
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import LandingNavbar from "@/components/landing/landing-navbar";
import HeroSection from "@/components/landing/hero-section";
import ModulesGrid from "@/components/landing/modules-grid";
import TechnicalSection from "@/components/landing/technical-section";
import LandingFooter from "@/components/landing/landing-footer";
import WorkflowSection from "@/components/landing/workflow-section";
import TimelineSection from "@/components/landing/timeline-section";
import MobileSection from "@/components/landing/mobile-section";
import FAQSection from "@/components/landing/faq-section";

// Força verificação a cada acesso para garantir status de login correto
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    let isConfigured = false;
    const session = await getSession();
    const isLoggedIn = !!session;

    try {
        // Verifica se existe pelo menos um usuário/configuração para determinar se é 'setup' ou 'login'.
        const userCount = await prisma.user.count(); 
        isConfigured = userCount > 0;
    } catch (error) {
        // Se falhar (ex: banco vazio), assume que a configuração é necessária.
        isConfigured = false;
    }

    const authState = {
        isLoggedIn,
        isConfigured
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
            
            {/* --- BACKGROUND AMBIENT (Fixa no Server) --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-800/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-800/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" /> 
            </div>

            {/* Componentes */}
            <LandingNavbar authState={authState} />

            <main>
                <HeroSection authState={authState} />
                <ModulesGrid />
                <WorkflowSection/>
                <TechnicalSection />
                <TimelineSection/>
                <MobileSection/>
                <FAQSection/>
            </main>

            <LandingFooter />
        </div>
    );
}