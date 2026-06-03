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
import StatsSection from "@/components/landing/stats-section";
import FinalCTASection from "@/components/landing/final-cta-section";
import { Reveal } from "@/components/landing/reveal";

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
        <div className="landing-surface relative min-h-screen overflow-x-hidden font-sans selection:bg-primary/25">

            {/* --- BACKGROUND AMBIENT (themeable: light/dark) --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="landing-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
                <div className="landing-aurora" />
            </div>

            {/* Componentes */}
            {/* Passamos o authState para a Navbar e Hero saberem se mostram "Login" ou "Setup" */}
            <LandingNavbar authState={authState} />

            <main>
                {/* Hero já tem entrada própria; as demais seções revelam ao rolar. */}
                <HeroSection authState={authState} />
                <Reveal><ModulesGrid /></Reveal>
                <Reveal><StatsSection /></Reveal>
                <Reveal><WorkflowSection/></Reveal>
                <Reveal><TechnicalSection /></Reveal>
                <Reveal><TimelineSection/></Reveal>
                <Reveal><MobileSection/></Reveal>
                <Reveal><FAQSection/></Reveal>
                <Reveal><FinalCTASection authState={authState} /></Reveal>
            </main>

            <LandingFooter />
        </div>
    );
}