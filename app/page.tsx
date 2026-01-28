// app/page.tsx
import { getSession } from "@/lib/auth";
import { isSystemInstalled } from "@/lib/db-config"; // <--- Importamos a checagem de arquivo
import LandingNavbar from "@/components/landing/landing-navbar";
import HeroSection from "@/components/landing/hero-section";
import ModulesGrid from "@/components/landing/modules-grid";
import TechnicalSection from "@/components/landing/technical-section";
import LandingFooter from "@/components/landing/landing-footer";
import WorkflowSection from "@/components/landing/workflow-section";
import TimelineSection from "@/components/landing/timeline-section";
import MobileSection from "@/components/landing/mobile-section";
import FAQSection from "@/components/landing/faq-section";

// Força verificação a cada acesso para garantir status atualizado
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    // 1. Verifica se o sistema está instalado (se existe o config.json)
    const isConfigured = isSystemInstalled();

    // 2. Só tentamos buscar sessão se o sistema estiver configurado.
    // Se não estiver configurado, não tentamos tocar no banco para evitar crashes.
    const session = isConfigured ? await getSession() : null;
    const isLoggedIn = !!session;

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
            {/* Passamos o authState para a Navbar e Hero saberem se mostram "Login" ou "Setup" */}
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