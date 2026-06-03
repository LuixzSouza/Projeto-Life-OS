import { SetupWizard } from "@/components/setup/setup-wizard";
import { getEnvProfile } from "@/lib/db-config";

// Detecta o destino do banco a cada acesso (env vars podem mudar no deploy).
export const dynamic = "force-dynamic";

export default function SetupPage() {
    // Em deploy serverless (Vercel) o banco vem de TURSO_* nas env vars. Quando
    // presente, o wizard NÃO deve pedir pasta local nem URL/token — o destino já
    // está definido pelo ambiente. Também sinaliza que estamos no modo "web".
    const envProfile = getEnvProfile();
    const dbFromEnv = !!envProfile;

    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-background">
                <div className="absolute h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>

            <SetupWizard dbFromEnv={dbFromEnv} />
        </main>
    );
}
