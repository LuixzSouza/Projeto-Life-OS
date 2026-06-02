import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Cake, Heart, Star } from "lucide-react";
import Link from "next/link";
import type { DashboardBirthday } from "@/components/dashboard/types";

interface BirthdaysCardProps {
  birthdays: DashboardBirthday[];
}

export function BirthdaysCard({ birthdays }: BirthdaysCardProps) {
  return (
    <Card className="shadow-sm border-pink-200/50 dark:border-pink-900/30 bg-gradient-to-br from-pink-50/30 to-background dark:from-pink-950/10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-pink-600 dark:text-pink-400">
          <Cake className="h-4 w-4" /> Aniversários
        </CardTitle>
        <Link href="/social" className="text-xs text-muted-foreground hover:text-pink-500 hover:underline">Ver rede</Link>
      </CardHeader>
      <CardContent>
        {birthdays.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            Nenhum aniversário salvo.
          </div>
        ) : (
          <div className="space-y-3">
            {birthdays.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-background shadow-sm">
                    <AvatarImage src={friend.imageUrl || ""} />
                    <AvatarFallback className="bg-pink-100 text-pink-600 font-bold text-xs">{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm leading-none group-hover:text-pink-600 transition-colors">{friend.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      {friend.proximity === 'FAMILY' && <Heart className="h-2.5 w-2.5 text-purple-500" />}
                      {friend.proximity === 'CLOSE' && <Star className="h-2.5 w-2.5 text-amber-500" />}
                      Fazendo {friend.ageTurning} anos
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={cn("text-[10px] border-none", friend.daysUntil === 0 ? "bg-pink-500 hover:bg-pink-600 text-white animate-pulse shadow-sm" : "bg-muted")}>
                  {friend.daysUntil === 0 ? 'É Hoje! 🎉' : friend.daysUntil === 1 ? 'Amanhã' : `Em ${friend.daysUntil} dias`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
