"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login } from "@/lib/auth";

export async function setupSystem(formData: FormData) {
    // 1. OBTENÇÃO DE DADOS CRUCIAIS DO FORMULÁRIO DE SETUP
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const initialPassword = formData.get("password") as string;
    
    // Outros dados
    const bio = formData.get("bio") as string;
    const aiProvider = formData.get("aiProvider") as string;
    const theme = formData.get("theme") as string;
    const currency = formData.get("currency") as string;
    const workStart = formData.get("workStart") as string;
    const workEnd = formData.get("workEnd") as string;

    // Validação de Segurança (Apenas para o Admin)
    if (!name || name.trim() === "" || !email || !initialPassword) {
        throw new Error("Nome, Email e Senha são campos obrigatórios para o Setup inicial.");
    }
    
    // 2. VERIFICAÇÃO DE USUÁRIO EXISTENTE
    const existingAdmin = await prisma.user.findFirst();
    if (existingAdmin) {
        throw new Error("O sistema já está configurado. Use a página de login.");
    }

    // 3. CRIAÇÃO DA CONTA ADMINISTRADORA (USER FORNECIDO NO SETUP)
    const adminUser = await prisma.user.create({
        data: {
            name: name,
            email: email, 
            password: initialPassword, 
            bio: bio || null, 
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
        }
    });

    // 4. CRIAÇÃO DA CONTA DE DEMONSTRAÇÃO (TESTE)
    const demoEmail = "demo@lifeos.local";
    const existingDemoUser = await prisma.user.findUnique({ where: { email: demoEmail } });

    if (!existingDemoUser) {
         await prisma.user.create({
            data: {
                name: "Usuário de Teste",
                email: demoEmail,
                password: "teste", // Senha de teste fixa e simples
                bio: "Esta conta é para demonstração e não armazena dados persistentes.",
                avatarUrl: `https://ui-avatars.com/api/?name=Demo+User&background=3b82f6&color=fff`,
            }
        });
    }


    // 5. CRIAÇÃO DAS CONFIGURAÇÕES GLOBAIS
    // As configurações são vinculadas ao primeiro usuário (adminUser) ou são globais (se o campo userId for opcional/ausente)
    await prisma.settings.create({
        data: {
            aiProvider: aiProvider || "ollama",
            theme: theme || "system",
            currency: currency || "BRL",
            workStart: workStart || "09:00",
            workEnd: workEnd || "18:00",
            language: "pt-BR",
            aiModel: aiProvider === 'ollama' ? 'llama3' : 'gpt-3.5-turbo',
            onboardingCompleted: true, 
            userId: adminUser.id, // Vincula as configurações ao Admin
        }
    });

    // 6. LOGIN AUTOMÁTICO E REDIRECIONAMENTO (usando a conta do setup)
    await login(adminUser.id);

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

export async function completeOnboarding() {
    const settings = await prisma.settings.findFirst();
    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: { onboardingCompleted: true }
        });
        revalidatePath("/");
    }
}