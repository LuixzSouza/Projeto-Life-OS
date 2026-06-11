"use client";

// Sessões ativas (aba Segurança): "Desconectar outros dispositivos" incrementa
// a versão de token no servidor — todo JWT antigo morre na hora; só o cookie
// deste dispositivo é reemitido. Confirmação inline (sem AlertDialog em lista).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { disconnectOtherDevices } from "@/app/(dashboard)/settings/actions/security";

export function SessionsCard() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      const res = await disconnectOtherDevices();
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      setConfirming(false);
    });
  };

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Sessões ativas
        </CardTitle>
        <CardDescription>
          Entrou em outro computador ou emprestou o celular? Encerre todas as outras
          sessões de uma vez — esta permanece conectada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground mr-auto">
              Todos os outros dispositivos precisarão fazer login de novo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={handleDisconnect}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar agora
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="h-10 gap-2" onClick={() => setConfirming(true)}>
            <LogOut className="h-4 w-4" />
            Desconectar outros dispositivos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
