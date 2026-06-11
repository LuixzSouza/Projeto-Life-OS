import { prisma } from "@/lib/prisma"
import { Link2 } from "lucide-react"
import { LinkGrid } from "@/components/links/link-grid"
import { getCurrentUserId } from "@/lib/auth"
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell"
import { AskAiButton } from "@/components/ai/ask-ai-button"

export default async function LinksPage() {
  const userId = await getCurrentUserId()
  const links = await prisma.savedLink.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  const categoryCount = new Set(links.map((l) => l.category || "Geral")).size

  return (
    <PageShell>
      <PageHeader
        icon={<Link2 className="h-6 w-6" />}
        title="Biblioteca de Links"
        description="Centralize recursos importantes, referências e ferramentas para acesso rápido e organizado."
        actions={
          <div className="flex items-center gap-3">
            <AskAiButton q="Organize minha biblioteca de links: o que está sem categoria ou parece duplicado?" label="Organizar com IA" />
            <HeaderStat value={links.length} label="Links" />
            <HeaderStat value={categoryCount} label="Categorias" />
          </div>
        }
      />

      <PageContainer className="space-y-10">
        <LinkGrid links={links} />
      </PageContainer>
    </PageShell>
  )
}

function HeaderStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-5 py-3 text-center shadow-sm">
      <span className="block text-2xl font-bold leading-none text-foreground">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
