"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, Check, CheckCheck, RefreshCw, Calendar, Cake, Receipt, ListTodo, Layers,
  Inbox, BadgeCheck, HandCoins, CalendarClock, X, Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  refreshInboxAction,
  markReadAction,
  markAllReadAction,
  deleteNotificationAction,
  clearReadAction,
  generateRemindersAction,
} from "@/app/(dashboard)/notifications/actions";
import type { ClientNotification, NotificationInbox } from "@/lib/notifications";

const ICONS: Record<string, React.ElementType> = {
  INVOICE_DUE: Receipt,
  INVOICE_PAID: BadgeCheck,
  CHARGE_DUE: HandCoins,
  BILL_DUE: CalendarClock,
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

// Chip de prazo: "venceu" / "hoje" / "amanhã" / "em Nd" para itens com dueAt.
function dueChip(iso: string | null): { text: string; tone: string } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = Math.floor((due.getTime() - today.getTime()) / 864e5);
  if (d < 0) return { text: "venceu", tone: "bg-rose-500/10 text-rose-500" };
  if (d === 0) return { text: "hoje", tone: "bg-amber-500/10 text-amber-600" };
  if (d === 1) return { text: "amanhã", tone: "bg-primary/10 text-primary" };
  if (d <= 14) return { text: `em ${d}d`, tone: "bg-muted text-muted-foreground" };
  return null;
}

// Detecção de mobile (sm-) para trocar Popover ↔ bottom sheet.
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

type InboxTab = "unread" | "all";

export function NotificationBell({
  initial,
  isCollapsed = false,
}: {
  initial: NotificationInbox;
  isCollapsed?: boolean;
}) {
  const [inbox, setInbox] = useState<NotificationInbox>(initial);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InboxTab>("unread");
  const [pending, startTransition] = useTransition();
  const isMobile = useIsMobile();

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
    // Ao abrir: gera lembretes derivados dos dados (idempotente) E recarrega —
    // antes era preciso clicar no refresh para os lembretes aparecerem.
    if (o) run(generateRemindersAction);
  };

  const unread = inbox.unreadCount;
  const readCount = inbox.items.filter((n) => n.readAt).length;
  const visible = tab === "unread" ? inbox.items.filter((n) => !n.readAt) : inbox.items;

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      onClick={isMobile ? () => onOpenChange(true) : undefined}
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
  );

  const panel = (
    <InboxPanel
      inbox={inbox}
      visible={visible}
      tab={tab}
      setTab={setTab}
      pending={pending}
      unread={unread}
      readCount={readCount}
      isMobile={isMobile}
      onRefresh={() => run(refreshInboxAction)}
      onMarkAll={() => run(markAllReadAction)}
      onClearRead={() => run(clearReadAction)}
      onRead={(id) => run(() => markReadAction(id))}
      onDelete={(id) => run(() => deleteNotificationAction(id))}
      onNavigate={() => setOpen(false)}
    />
  );

  // MOBILE: bottom sheet de tela quase cheia (popover de 320px era inutilizável).
  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="flex h-[82dvh] flex-col gap-0 rounded-t-3xl p-0">
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>
            <SheetHeader className="space-y-0 px-4 pb-0 pt-1 text-left">
              <SheetTitle className="text-base font-bold">Notificações</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={12} className="flex w-96 flex-col p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <span className="text-sm font-semibold">Notificações</span>
        </div>
        {panel}
      </PopoverContent>
    </Popover>
  );
}

// Painel compartilhado entre o popover (desktop) e o bottom sheet (mobile).
function InboxPanel({
  inbox, visible, tab, setTab, pending, unread, readCount, isMobile,
  onRefresh, onMarkAll, onClearRead, onRead, onDelete, onNavigate,
}: {
  inbox: NotificationInbox;
  visible: ClientNotification[];
  tab: InboxTab;
  setTab: (t: InboxTab) => void;
  pending: boolean;
  unread: number;
  readCount: number;
  isMobile: boolean;
  onRefresh: () => void;
  onMarkAll: () => void;
  onClearRead: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}) {
  return (
    <>
      {/* Abas + ações */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex rounded-lg border border-border/40 bg-muted/40 p-0.5">
          <TabButton active={tab === "unread"} onClick={() => setTab("unread")}>
            Não lidas{unread > 0 ? ` (${unread})` : ""}
          </TabButton>
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            Todas
          </TabButton>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
            title="Atualizar" aria-label="Atualizar" disabled={pending}
            onClick={onRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
            title="Marcar todas como lidas" aria-label="Marcar todas como lidas"
            disabled={pending || unread === 0}
            onClick={onMarkAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500"
            title="Limpar notificações lidas" aria-label="Limpar notificações lidas"
            disabled={pending || readCount === 0}
            onClick={onClearRead}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className={cn(isMobile ? "flex-1" : "max-h-96")}>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">
              {tab === "unread" && inbox.items.length > 0 ? "Tudo lido! 🎉" : "Nada por aqui"}
            </p>
            <p className="max-w-[240px] text-xs text-muted-foreground">
              {tab === "unread" && inbox.items.length > 0
                ? "Veja o histórico na aba “Todas”."
                : "Faturas, eventos, aniversários e tarefas atrasadas aparecem aqui automaticamente."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {visible.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onRead={() => onRead(n.id)}
                onDelete={() => onDelete(n.id)}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NotificationRow({
  n,
  onRead,
  onDelete,
  onNavigate,
}: {
  n: ClientNotification;
  onRead: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const Icon = ICONS[n.type] ?? Bell;
  const unread = !n.readAt;
  const due = dueChip(n.dueAt);

  const body = (
    <div className={cn("flex gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:py-2.5", unread && "bg-primary/[0.04]")}>
      <div className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        n.priority === "HIGH" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/80")}>{n.title}</p>
        {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
          {due && (
            <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", due.tone)}>{due.text}</span>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
        {unread && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(); }}
            title="Marcar como lida"
            aria-label="Marcar como lida"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          title="Excluir notificação"
          aria-label="Excluir notificação"
          className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-rose-500/10 hover:text-rose-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
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
