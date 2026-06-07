"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { migrateToReplica, testTursoConnection } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Cloud, RefreshCw, Smartphone, PlugZap } from "lucide-react";

/**
 * Card de "Conectar à Nuvem" (modo Híbrido) exibido quando a instalação é local.
 * Sobe os dados locais para um Turso (mesclando) e ativa a réplica embarcada —
 * a partir daí o celular acessa os mesmos dados pela nuvem.
 */
export function MigrateToReplicaCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");

  const handleTest = () => {
    startTesting(async () => {
      const res = await testTursoConnection(url, token);
      if (res.success) toast.success(res.message);
      else toast.error(res.message, { duration: 8000 });
    });
  };

  const handleSubmit = () => {
    if (!url.trim()) {
      toast.error("Informe a URL do Turso.");
      return;
    }
    const fd = new FormData();
    fd.set("tursoUrl", url);
    fd.set("tursoToken", token);
    startTransition(async () => {
      const res = await migrateToReplica(fd);
      if (res.success) {
        toast.success(res.message, { duration: 7000 });
        router.refresh(); // re-renderiza já em modo réplica (mostra o card de sync)
      } else {
        toast.error(res.message, { duration: 8000 });
      }
    });
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-background rounded-xl shadow-sm text-cyan-500 border border-cyan-500/20 shrink-0">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">Acessar pelo celular (modo Híbrido)</h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            Conecte um banco Turso para espelhar seus dados na nuvem. Seus dados
            locais são <strong>enviados (mesclados, sem apagar nada)</strong> e o PC
            passa a sincronizar automaticamente. Depois é só acessar a versão web
            pelo celular. Seu arquivo local original fica intacto como backup.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="migrateUrl" className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
            <Cloud className="h-3.5 w-3.5" /> URL do Turso
          </Label>
          <Input
            id="migrateUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="libsql://seu-banco.turso.io"
            className="bg-background font-mono text-xs border-cyan-500/20 h-10"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="migrateToken" className="text-[11px] font-semibold uppercase text-muted-foreground">
            Token de Autenticação
          </Label>
          <Input
            id="migrateToken"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOi..."
            className="bg-background font-mono text-xs border-cyan-500/20 h-10"
          />
          <p className="text-[10px] text-amber-600/90">
            ⚠️ O token começa com <code>eyJ…</code> — gere com{" "}
            <code>turso db tokens create &lt;nome&gt;</code>.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || isPending}
          className="border-cyan-500/30 hover:bg-cyan-500/10"
        >
          <PlugZap className={isTesting ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          {isTesting ? "Testando..." : "Testar conexão"}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || isTesting}
          className="bg-cyan-600 text-white hover:bg-cyan-600/90 shadow-sm"
        >
          <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {isPending ? "Enviando dados ao Turso..." : "Conectar e enviar dados"}
        </Button>
      </div>
    </div>
  );
}
