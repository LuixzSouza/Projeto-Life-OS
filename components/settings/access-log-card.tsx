// Lista dos últimos acessos (logins) — aba Segurança. Server-friendly:
// recebe os registros já serializados da página de Configurações.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, MonitorSmartphone } from "lucide-react";

export interface AccessLogEntry {
  id: string;
  action: string;
  ip: string;
  device: string;
  createdAt: string; // ISO
}

/** Resumo humano do User-Agent (sem dependências). */
export function describeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Navegador";
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
}

export function AccessLogCard({ entries }: { entries: AccessLogEntry[] }) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Últimos acessos
        </CardTitle>
        <CardDescription>
          Logins registrados nesta instância (IP e dispositivo). Algo estranho aqui?
          Troque a senha mestra acima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum acesso registrado ainda — os próximos logins aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MonitorSmartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{e.device}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{e.ip}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge
                    className={
                      e.action === "REGISTER"
                        ? "bg-blue-500/10 text-blue-600 border-none"
                        : e.action === "REVOKE"
                          ? "bg-amber-500/10 text-amber-600 border-none"
                          : "bg-emerald-500/10 text-emerald-600 border-none"
                    }
                  >
                    {e.action === "REGISTER" ? "Cadastro" : e.action === "REVOKE" ? "Revogação" : "Login"}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(e.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
