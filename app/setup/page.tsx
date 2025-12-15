// app/setup/page.tsx
import { prisma } from "@/lib/prisma";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { redirect } from "next/navigation";

export default async function SetupPage() {
  // Segurança: Se já tem usuário, não deixa acessar o setup e manda para o dashboard
  const userCount = await prisma.user.count();
  
  if (userCount > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      
      {/* Background Decorativo (Grid e Gradiente) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        {/* Grid Pattern */}
        <div className="absolute h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Radial Gradient para dar profundidade */}
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>

      <SetupWizard />
    </main>
  );
}