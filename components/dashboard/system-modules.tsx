import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Server, Flame, Droplets, Bot, Shirt, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import type { DashboardLink } from "@/components/dashboard/types";

interface SystemModulesProps {
  calsToday: number;
  waterToday: number;
  aiMessagesCount: number;
  favoriteClothesCount: number;
  recentLinks: DashboardLink[];
}

export function SystemModules({
  calsToday,
  waterToday,
  aiMessagesCount,
  favoriteClothesCount,
  recentLinks,
}: SystemModulesProps) {
  return (
    <div className="pt-6 border-t border-border/40">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Server className="h-5 w-5 text-muted-foreground" />
        Módulos do Sistema
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saúde Rápida */}
        <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-emerald-500" /> Ingestão
              </span>
              <Link href="/health" className="text-[10px] text-primary hover:underline">Monitor</Link>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{calsToday} kcal</span>
                <span className="text-muted-foreground">2500 kcal</span>
              </div>
              <Progress value={(calsToday / 2500) * 100} className="h-1.5" />
            </div>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none"><Droplets className="h-3 w-3 mr-1" /> {waterToday}ml</Badge>
            </div>
          </CardContent>
        </Card>

        {/* IA e Automação */}
        <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-primary" /> Assistente IA
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold">{aiMessagesCount} <span className="text-sm font-normal text-muted-foreground">pings hoje</span></div>
            </div>
            <Link href="/ai" className="mt-4">
              <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1">Abrir Chat</Badge>
            </Link>
          </CardContent>
        </Card>

        {/* Closet */}
        <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Shirt className="h-3.5 w-3.5 text-amber-500" /> Closet
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold">{favoriteClothesCount} <span className="text-sm font-normal text-muted-foreground">peças favoritas</span></div>
            </div>
            <Link href="/wardrobe" className="mt-4">
              <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1">Acessar</Badge>
            </Link>
          </CardContent>
        </Card>

        {/* Links e Sites */}
        <Card className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-indigo-500" /> Links Salvos
              </span>
              <Link href="/links" className="text-[10px] text-primary hover:underline">Ver Todos</Link>
            </div>
            <div className="space-y-2 flex-1">
              {recentLinks.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">Nenhum link salvo.</div>
              ) : (
                recentLinks.slice(0, 2).map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                    <div className="h-6 w-6 rounded bg-muted/50 flex items-center justify-center shrink-0">
                      <LinkIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium truncate">{link.title}</span>
                  </a>
                ))
              )}
            </div>
            <Link href="/cms" className="mt-2 block">
              <Badge variant="outline" className="w-full justify-center hover:bg-muted py-1 border-dashed">Gerenciar CMS</Badge>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
