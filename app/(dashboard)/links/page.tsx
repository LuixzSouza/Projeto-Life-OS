import { prisma } from "@/lib/prisma"
import { Globe, Link2 } from "lucide-react"
import { LinkGrid } from "@/components/links/link-grid"

export default async function LinksPage() {
  const links = await prisma.savedLink.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* -------------------------------------------------------------------------------------------------
       * HEADER — PADRÃO ENTERPRISE (IGUAL AOS OUTROS)
       * ------------------------------------------------------------------------------------------------- */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-primary rounded-lg shadow-lg shadow-primary/25">
                  <Link2 className="h-6 w-6 text-primary-foreground" />
                </div>
                Biblioteca de Links
              </h1>

              <p className="text-muted-foreground text-lg max-w-2xl">
                Centralize recursos importantes, referências e ferramentas para
                acesso rápido e organizado.
              </p>
            </div>

            {/* Informação rápida */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              <span>
                <strong className="text-foreground">{links.length}</strong>{" "}
                links salvos
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------------------------------------
       * MAIN
       * ------------------------------------------------------------------------------------------------- */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <LinkGrid links={links} />
      </main>
    </div>
  )
}
