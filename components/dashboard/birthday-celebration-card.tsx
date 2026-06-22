// Card proativo do Dashboard: quando é aniversário de alguém da sua rede HOJE,
// surge um convite festivo para abrir a página de celebração da pessoa.
// Some sozinho nos dias em que não há aniversariante.

import Link from "next/link";
import { PartyPopper, Cake, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { isBirthdayToday, turningAge, displayNameOf } from "@/lib/celebration";

export async function BirthdayCelebrationCard() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const friends = await prisma.friend.findMany({
    where: { userId, deletedAt: null, birthday: { not: null } },
    select: { id: true, name: true, nickname: true, birthday: true, imageUrl: true },
  });

  const todays = friends.filter((f) => isBirthdayToday(f.birthday));
  if (todays.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-pink-500/10 blur-2xl" />

      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/15 text-pink-500">
          <PartyPopper className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600/80 dark:text-pink-400/80">
            Aniversário hoje
          </p>
          <p className="text-sm font-bold text-foreground">
            {todays.length === 1
              ? `${displayNameOf(todays[0])} faz aniversário hoje! 🎉`
              : `${todays.length} pessoas da sua rede fazem aniversário hoje! 🎉`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {todays.map((f) => {
          const age = turningAge(f.birthday);
          return (
            <Link
              key={f.id}
              href={`/social/celebrar/${f.id}`}
              className="group inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-background/70 px-3.5 py-2 text-sm font-bold text-foreground shadow-sm backdrop-blur transition-all hover:scale-[1.03] hover:border-pink-500/50 hover:shadow-md"
            >
              <Cake className="h-4 w-4 text-pink-500" />
              Celebrar {displayNameOf(f)}
              {age ? <span className="text-xs font-semibold text-muted-foreground">({age})</span> : null}
              <ArrowRight className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
