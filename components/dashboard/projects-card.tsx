import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Briefcase } from "lucide-react";
import Link from "next/link";
import type { DashboardProject } from "@/components/dashboard/types";

interface ProjectsCardProps {
  projects: DashboardProject[];
}

export function ProjectsCard({ projects }: ProjectsCardProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" /> Projetos Pessoais
        </CardTitle>
        <Link href="/projects" className="text-xs text-primary hover:underline">Ver tudo</Link>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
            Nenhum projeto ativo.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map(proj => (
              <Link key={proj.id} href={`/projects/${proj.id}`}>
                <div className="group flex flex-col p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">Andamento</Badge>
                  </div>
                  <span className="font-medium text-sm truncate">{proj.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{proj.description || "Sem descrição"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
