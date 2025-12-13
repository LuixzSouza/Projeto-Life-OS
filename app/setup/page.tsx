// app/setup/page.tsx
import { prisma } from "@/lib/prisma";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { redirect } from "next/navigation";

export default async function SetupPage() {
  // Segurança: Se já tem usuário, não deixa acessar o setup
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#1a1a2e,transparent)]"></div>
      </div>
      <SetupWizard />
    </main>
  );
}