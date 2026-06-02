import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { QrCode, Building2 } from "lucide-react";

interface BillingCardProps {
  pixKey: string;
  setPixKey: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
}

// Dados usados nas mensagens de cobrança do módulo Negócios (WhatsApp/PIX).
export function BillingCard({ pixKey, setPixKey, businessName, setBusinessName }: BillingCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" /> Cobrança & Negócios
        </CardTitle>
        <CardDescription>Usado nas mensagens de cobrança enviadas aos seus clientes.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pixKey" className="text-muted-foreground flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5" /> Chave PIX
          </Label>
          <Input
            id="pixKey"
            name="pixKey"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            className="bg-muted/30 border-border/60 h-11 font-mono"
          />
          <p className="text-[10px] text-muted-foreground px-1">Incluída automaticamente no resumo de cobrança.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Nome / Assinatura
          </Label>
          <Input
            id="businessName"
            name="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: João Silva — Studio Design"
            className="bg-muted/30 border-border/60 h-11"
          />
          <p className="text-[10px] text-muted-foreground px-1">Assina o final da mensagem de cobrança.</p>
        </div>
      </CardContent>
    </Card>
  );
}
