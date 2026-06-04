"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, RefreshCw, Calendar, Cake, Receipt, ListTodo, Layers, Inbox, BadgeCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  refreshInboxAction,
  markReadAction,
  markAllReadAction,
  generateRemindersAction,
} from "@/app/(dashboard)/notifications/actions";
import type { ClientNotification, NotificationInbox } from "@/lib/notifications";

const ICONS: Record<string, React.ElementType> = {
  INVOICE_DUE: Receipt,
  INVOICE_PAID: BadgeCheck,
  EVENT: Calendar,
  BIRTHDAY: Cake,
  TASK_DUE: ListTodo,
  FLASHCARD_REVIEW: Layers,
  SYSTEM: Bell,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function NotificationBell({
  initial,
  isCollapsed = false,
}: {
  initial: NotificationInbox;
  isCollapsed?: boolean;
}) {
  const [inbox, setInbox] = useState<NotificationInbox>(initial);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<NotificationInbox>) =>
    startTransition(async () => {
      try {
        setInbox(await fn());
      } catch {
        /* silencioso — mantém estado atual */
      }
    });

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) run(refreshInboxAction); // sempre busca o mais recente ao abrir
  };

  const unread = inbox.unreadCount;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9 text-muted-foreground hover:text-foreground", isCollapsed && "mx-auto")}
          title="Notificações"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="right" sideOffset={12} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <span className="text-sm font-semibold">Notificações</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
              title="Gerar lembretes" disabled={pending}
              onClick={() => run(generateRemindersAction)}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
              title="Marcar todas como lidas" disabled={pending || unread === 0}
              onClick={() => run(markAllReadAction)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {inbox.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nada por aqui.</p>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(generateRemindersAction)}>
                Gerar lembretes
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {inbox.items.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={() => run(() => markReadAction(n.id))} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  n,
  onRead,
  onNavigate,
}: {
  n: ClientNotification;
  onRead: () => void;
  onNavigate: () => void;
}) {
  const Icon = ICONS[n.type] ?? Bell;
  const unread = !n.readAt;

  const body = (
    <div className={cn("flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40", unread && "bg-primary/[0.04]")}>
      <div className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        n.priority === "HIGH" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/80")}>{n.title}</p>
        {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
      </div>
      {unread && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(); }}
          title="Marcar como lida"
          className="self-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (n.actionUrl) {
    return (
      <li>
        <Link href={n.actionUrl} onClick={() => { onRead(); onNavigate(); }}>
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}
