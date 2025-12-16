// app/login/page.tsx (Server Component)

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LoginPageClient from "@/components/login/LoginPageClient"; 

export default async function LoginPage() {
    // 1. Verifica se existe pelo menos um usuário (indicando que o Setup foi feito).
    const userCount = await prisma.user.count();

    if (userCount === 0) {
        // 2. Se NENHUM usuário existir, o sistema não está configurado.
        // Redireciona para o Setup Wizard para que a pessoa crie a conta dela.
        redirect("/setup"); 
    }

    // 3. Se existem usuários, exibe a página de Login.
    return <LoginPageClient />;
}