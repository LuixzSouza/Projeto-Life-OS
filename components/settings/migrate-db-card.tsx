"use client";

// Card "Mudar de banco" (DATABASE_ROADMAP · Fase 3): testar o destino →
// migrar com backup forçado → relatório por model. O banco antigo fica
// intacto — dá para "testar e voltar" sem medo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  testMigrationTarget,
  migrateToTarget,
  type MigrationTargetInput,
  type MigrationTestResult,
} from "@/app/(dashboard)/settings/actions";
import type { CopyReport } from "@/lib/db-copy";
import { FolderPicker } from "@/components/settings/folder-picker";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  Cloud,
  Server,
  Database,
  HardDrive,
  PlugZap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type TargetKind = MigrationTargetInput["kind"];

const KINDS: { id: TargetKind; label: string; icon: typeof Cloud }[] = [
  { id: "turso", label: "Turso", icon: Cloud },
  { id: "postgres", label: "Postgres / Supabase", icon: Server },
  { id: "mysql", label: "MySQL", icon: Database },
  { id: "local", label: "Arquivo local", icon: HardDrive },
];

export function MigrateDbCard() {
  const router = useRouter();
  const [kind, setKind] = useState<TargetKind>("turso");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [test, setTest] = useState<MigrationTestResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [report, setReport] = useState<CopyReport | null>(null);
  const [isTesting, startTesting] = useTransition();
  const [isMigrating, startMigrating] = useTransition();

  const input: MigrationTargetInput =
    kind === "local"
      ? { kind, path: localPath }
      : kind === "turso"
        ? { kind, url, authToken: token }
        : { kind, url };

  const resetTest = () => {
    setTest(null);
    setConfirming(false);
    setReport(null);
  };

  const handleTest = () => {
    startTesting(async () => {
      const res = await testMigrationTarget(input);
      setTest(res);
      setConfirming(false);
      if (res.success) toast.success(res.message, { duration: 6000 });
      else toast.error(res.message, { duration: 9000 });
    });
  };

  const handleMigrate = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startMigrating(async () => {
      const res = await migrateToTarget(input, {
        allowNonEmpty: (test?.userCount ?? 0) > 0,
      });
      setConfirming(false);
      if (res.success) {
        setReport(res.report ?? null);
        toast.success(res.message, { duration: 12000 });
        router.refresh(); // a página re-renderiza já apontando p/ o banco novo
      } else {
        toast.error(res.message, { duration: 10000 });
      }
    });
  };

  const canMigrate = !!test?.success && !isMigrating && !isTesting;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-background rounded-xl shadow-sm text-violet-500 border border-violet-500/20 shrink-0">
          <ArrowRightLeft className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">Mudar de banco</h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            Copia <strong>todos os dados</strong> (todos os usuários e módulos) para outro
            banco e passa a usá-lo — sem reiniciar o app. Antes de copiar, um{" "}
            <strong>backup completo é gerado automaticamente</strong> e o banco atual{" "}
            <strong>permanece intacto</strong>: dá para testar e voltar.
          </p>
        </div>
      </div>

      {/* Destino */}
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKind(k.id);
              resetTest();
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              kind === k.id
                ? "border-violet-500/50 bg-violet-500/15 text-violet-600"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <k.icon className="h-3.5 w-3.5" /> {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {kind !== "local" && (
          <div className="grid gap-1.5">
            <Label htmlFor="migUrl" className="text-[11px] font-semibold uppercase text-muted-foreground">
              {kind === "turso" ? "URL do Turso" : "Connection string"}
            </Label>
            <Input
              id="migUrl"
              type={kind === "postgres" || kind === "mysql" ? "password" : "text"}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                resetTest();
              }}
              placeholder={
                kind === "turso"
                  ? "libsql://seu-banco.turso.io"
                  : kind === "mysql"
                    ? "mysql://usuario:senha@host:3306/banco"
                    : "postgresql://usuario:senha@host:5432/banco"
              }
              className="bg-background font-mono text-xs h-10"
            />
          </div>
        )}
        {kind === "turso" && (
          <div className="grid gap-1.5">
            <Label htmlFor="migToken" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Token (JWT eyJ…)
            </Label>
            <Input
              id="migToken"
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                resetTest();
              }}
              placeholder="eyJhbGciOi..."
              className="bg-background font-mono text-xs h-10"
            />
          </div>
        )}
        {kind === "local" && (
          <div className="grid gap-1.5">
            <Label htmlFor="migPath" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Pasta ou arquivo .db de destino
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="migPath"
                value={localPath}
                onChange={(e) => {
                  setLocalPath(e.target.value);
                  resetTest();
                }}
                placeholder="D:\MeusDados\LifeOS"
                className="bg-background font-mono text-xs h-10 flex-1"
              />
              {/* Navegador de pastas (o mesmo do wizard): escolher visualmente
                  em vez de digitar o caminho na mão. */}
              <FolderPicker
                currentPath={localPath}
                onSelect={(path) => {
                  setLocalPath(path);
                  resetTest();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Resultado do teste */}
      {test && (
        <p
          className={cn(
            "text-[11px] flex items-start gap-1.5 rounded-lg border p-2.5",
            test.success
              ? (test.userCount ?? 0) > 0
                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/5 text-rose-600",
          )}
        >
          {test.success ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          )}
          <span>{test.message}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || isMigrating}
          className="border-violet-500/30 hover:bg-violet-500/10"
        >
          <PlugZap className={isTesting ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          {isTesting ? "Conectando e criando schema..." : "Testar destino"}
        </Button>
        <Button
          type="button"
          onClick={handleMigrate}
          disabled={!canMigrate}
          className={cn(
            "text-white shadow-sm",
            confirming ? "bg-rose-600 hover:bg-rose-600/90" : "bg-violet-600 hover:bg-violet-600/90",
          )}
        >
          <ShieldCheck className={isMigrating ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          {isMigrating
            ? "Migrando (backup → cópia → troca)..."
            : confirming
              ? "Confirmar: copiar tudo e trocar o banco"
              : "Migrar agora"}
        </Button>
      </div>

      {/* Relatório pós-migração */}
      {report && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {report.totalCopied} de {report.totalSource} registros copiados
            {report.totalSkipped > 0 && ` · ${report.totalSkipped} pulados`}
          </p>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-[10px] font-mono">
              <tbody>
                {report.models
                  .filter((m) => m.source > 0)
                  .map((m) => (
                    <tr key={m.model} className="border-b border-border/30 last:border-0">
                      <td className="py-0.5 pr-2 text-muted-foreground">{m.model}</td>
                      <td className="py-0.5 text-right">
                        {m.copied}/{m.source}
                        {m.skipped > 0 && <span className="text-amber-600"> (-{m.skipped})</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
