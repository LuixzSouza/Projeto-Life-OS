"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BicepsFlexed, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MuscleCount } from "./gym-types";

interface MuscleFrequencyCardProps {
  distribution: MuscleCount[];
}

export function MuscleFrequencyCard({ distribution }: MuscleFrequencyCardProps) {
  return (
    <Card className="border-border/40 shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <BicepsFlexed className="h-4 w-4 text-primary" />
          Grupos Musculares
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {distribution.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum foco registrado.</p>
        ) : (
          distribution.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors",
                  i === 0
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted text-muted-foreground border-border group-hover:border-primary/30"
                )}>
                  {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </div>
              <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-xs font-mono px-2">
                {item.value}x
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
