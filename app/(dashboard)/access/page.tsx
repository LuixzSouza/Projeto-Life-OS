import { prisma } from "@/lib/prisma";
import { LockKeyhole, Briefcase, User, ShieldCheck } from "lucide-react";
import { AccessDialog } from "@/components/access/access-dialog";
import { AccessList } from "@/components/access/access-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default async function AccessPage() {
  // 1. Busca e Ordenação de todos os itens no servidor
  const allItems = await prisma.accessItem.findMany({
    orderBy: { title: "asc" },
  });

  // 2. Separação lógica para as abas
  const personalItems = allItems.filter(item => !item.client);
  const clientItems = allItems.filter(item => item.client !== null && item.client !== "");

  return (
    <section className="min-h-screen bg-background px-6 py-8 md:px-10 md:py-12 space-y-10">
      
      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col gap-6 border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* TÍTULO E DESCRIÇÃO */}
          <div className="flex items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm shrink-0">
              <LockKeyhole className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Cofre de Senhas
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                Gerencie seus {allItems.length} acessos com criptografia de nível militar. Seus dados, sob seu controle.
              </p>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="flex items-center gap-3 shrink-0">
            <AccessDialog />
          </div>
        </div>

        {/* INFO BAR DE SEGURANÇA */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
          <span className="flex items-center gap-1 font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Criptografia AES-256
          </span>
          <span className="flex items-center gap-1">
            🔐 {personalItems.length} Acessos Pessoais
          </span>
          <span className="flex items-center gap-1">
            💼 {clientItems.length} Acessos de Clientes
          </span>
        </div>
      </header>

      {/* CONTEÚDO COM TABS (Separando Pessoal e Cliente) */}
      <main>
        <Tabs defaultValue="PERSONAL" className="space-y-6">
            
            {/* Seletor de Abas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <TabsList className="bg-muted p-1 rounded-xl shadow-sm">
                    <TabsTrigger value="PERSONAL" className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground">
                        <User className="h-4 w-4" /> Pessoal
                        <span className="ml-1.5 text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full font-medium">{personalItems.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="CLIENTS" className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground">
                        <Briefcase className="h-4 w-4" /> Clientes
                        <span className="ml-1.5 text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full font-medium">{clientItems.length}</span>
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Conteúdo da Aba Pessoal */}
            <TabsContent value="PERSONAL" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {personalItems.length > 0 ? (
                    // Não mostra a badge do cliente
                    <AccessList items={personalItems} />
                ) : (
                    <EmptyState 
                        title="Nenhum Acesso Pessoal Salvo" 
                        sub="Comece adicionando logins de redes sociais, bancos ou contas pessoais." 
                        icon={User} 
                    />
                )}
            </TabsContent>

            {/* Conteúdo da Aba Clientes */}
            <TabsContent value="CLIENTS" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {clientItems.length > 0 ? (
                    // Mostra a badge do cliente
                    <AccessList items={clientItems} showClientBadge />
                ) : (
                    <EmptyState 
                        title="Nenhum Cliente Registrado" 
                        sub="Aqui aparecerão os acessos (servidores, CMS, painéis) vinculados aos seus projetos." 
                        icon={Briefcase} 
                    />
                )}
            </TabsContent>
        </Tabs>
      </main>
    </section>
  );
}

// O componente EmptyState precisa ser definido aqui, tipando corretamente o ícone
function EmptyState({ title, sub, icon: Icon = LockKeyhole }: { title: string, sub: string, icon?: React.ElementType }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-muted/10 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">{sub}</p>
        </div>
    )
}