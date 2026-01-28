"use server";

// NÃO importamos a instância global 'prisma' aqui para evitar cache antigo
import { PrismaClient } from "@prisma/client"; 
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login } from "@/lib/auth";
import { setDatabasePath } from "@/lib/db-config";
import fs from 'fs';
import path from 'path';
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function setupSystem(formData: FormData) {
    // Definimos uma variável para o cliente temporário
    let tempPrisma: PrismaClient | null = null;

    try {
        console.log("🚀 Iniciando Setup Completo...");

        // --- PARTE 1: CONFIGURAÇÃO DO ARQUIVO ---
        const storagePath = formData.get("storagePath") as string;
        
        if (!storagePath) throw new Error("O caminho do banco de dados é obrigatório.");

        // Cria pasta se não existir
        if (!fs.existsSync(storagePath)) {
            try {
                fs.mkdirSync(storagePath, { recursive: true });
            } catch (e) {
                throw new Error(`Sem permissão para criar pasta em: ${storagePath}`);
            }
        }

        const dbFilePath = path.join(storagePath, 'life_os.db');
        const dbUrl = `file:${dbFilePath}`;
        
        // 1. Salva o config JSON
        setDatabasePath(dbFilePath);
        
        // 2. Executa a criação das tabelas via comando do sistema
        console.log("📦 Criando tabelas no arquivo:", dbFilePath);
        
        // No Windows, as vezes o npx precisa do caminho completo ou shell true, mas vamos tentar o padrão.
        // Adicionei --schema para garantir que ele ache o schema se estiver rodando da raiz
        await execPromise(`npx prisma db push --accept-data-loss --skip-generate`, {
            env: { ...process.env, DATABASE_URL: dbUrl }
        });
        
        console.log("✅ Tabelas criadas (db push executado).");

        // --- PARTE 2: CONEXÃO DIRETA (O PULO DO GATO) ---
        // Instanciamos um cliente NOVO apontando explicitamente para o banco novo
        // Isso ignora qualquer cache antigo do Next.js
        tempPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: dbUrl,
                },
            },
        });

        // --- PARTE 3: CRIAÇÃO DE DADOS ---
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const bio = formData.get("bio") as string;
        
        const aiProvider = (formData.get("aiProvider") as string) || "ollama";
        const theme = (formData.get("theme") as string) || "system";
        const currency = (formData.get("currency") as string) || "BRL";
        const workStart = (formData.get("workStart") as string) || "09:00";
        const workEnd = (formData.get("workEnd") as string) || "18:00";

        if (!name || !email || !password) throw new Error("Dados obrigatórios faltando.");

        console.log("👤 Inserindo Admin no banco...");

        // Usamos tempPrisma aqui, NÃO o global
        const adminUser = await tempPrisma.user.create({
            data: {
                name,
                email,
                password, 
                bio: bio || "Admin",
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06b6d4&color=fff&bold=true`,
            }
        });

        await tempPrisma.settings.create({
            data: {
                aiProvider, theme, currency, workStart, workEnd,
                language: "pt-BR",
                aiModel: aiProvider === 'ollama' ? 'llama3' : 'gpt-4o',
                onboardingCompleted: true,
                userId: adminUser.id,
                storagePath: storagePath,
            }
        });

        // Conta Demo
        const demoEmail = "demo@lifeos.local";
        const demoExists = await tempPrisma.user.findUnique({ where: { email: demoEmail } });
        if (!demoExists) {
             await tempPrisma.user.create({
                data: {
                    name: "Usuário Demo",
                    email: demoEmail,
                    password: "demo",
                    bio: "Conta de testes.",
                    avatarUrl: `https://ui-avatars.com/api/?name=Demo&background=333&color=fff`,
                }
            });
        }

        console.log("✅ Dados inseridos com sucesso!");

        // Login (aqui usamos a lib auth que pode usar o global, mas como o dado já tá lá, deve funcionar)
        // Se der erro no login, é porque o prisma global ainda não atualizou. 
        // Nesse caso, o redirect vai forçar um refresh.
        try {
            await login(adminUser.id);
        } catch (e) {
            console.warn("Aviso: Login automático falhou (normal na 1ª vez), usuário precisará logar manualmente.");
        }

    } catch (error) {
        console.error("❌ Erro CRÍTICO no Setup:", error);
        throw new Error(error instanceof Error ? error.message : "Falha desconhecida.");
    } finally {
        // Fecha a conexão temporária para não vazar memória
        if (tempPrisma) {
            await tempPrisma.$disconnect();
        }
    }

    revalidatePath("/");
    redirect("/dashboard");
}

// Função auxiliar usada pelo componente de Tour
export async function completeOnboarding() {
    // Aqui podemos usar o global pois o sistema já reiniciou ou já estabilizou
    const { prisma } = await import("@/lib/prisma"); 
    
    try {
        const settings = await prisma.settings.findFirst();
        if (settings) {
            await prisma.settings.update({
                where: { id: settings.id },
                data: { onboardingCompleted: true }
            });
            revalidatePath("/");
        }
    } catch (error) {
        console.error("Erro onboarding:", error);
    }
}