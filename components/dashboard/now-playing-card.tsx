import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Star } from "lucide-react";
import Link from "next/link";
import type { DashboardMedia } from "@/components/dashboard/types";

interface NowPlayingCardProps {
  media: DashboardMedia[];
}

export function NowPlayingCard({ media }: NowPlayingCardProps) {
  return (
    <Card className="shadow-sm border-border/50 bg-gradient-to-b from-card to-muted/10">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-muted-foreground" /> Consumindo Agora
        </CardTitle>
        <Link href="/entertainment" className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors">Ver tudo</Link>
      </CardHeader>
      <CardContent>
        {media.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
            Nada no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {media.map(item => (
              <div key={item.id} className="flex gap-3 items-center group cursor-pointer">
                <div className="h-10 w-10 bg-muted rounded border border-border/50 overflow-hidden shrink-0">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Star className="h-3 w-3 text-muted-foreground/30" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
