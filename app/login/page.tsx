import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSystemInstalled } from "@/lib/db-config";
import LoginPageClient from "@/components/login/LoginPageClient"; 

export default async function LoginPage() {
    // 1. Verifica arquivo de configuração (sistema instalado?)
    if (!isSystemInstalled()) {
        redirect("/setup");
    }

    let userCount = 0;

    try {
        // 2. Tenta apenas buscar os dados dentro do try
        userCount = await prisma.user.count();
    } catch (error) {
        // Se der erro REAL de banco (conexão recusada, arquivo corrompido), cai aqui.
        console.error("Erro crítico ao acessar banco de dados:", error);
        // O redirect aqui funciona porque é o fim da execução neste bloco
        redirect("/setup");
    }

    // 3. Verificação de Lógica de Negócio (FORA do try/catch)
    // Se não tem usuários, manda criar o Admin.
    if (userCount === 0) {
         redirect("/setup"); 
    }

    // 4. Se passou por tudo, exibe o login
    return <LoginPageClient />;
}