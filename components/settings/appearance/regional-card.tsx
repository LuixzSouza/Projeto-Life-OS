import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES, formatCurrency } from "@/lib/utils";

interface RegionalCardProps {
  currency: string;
  setCurrency: (v: string) => void;
}

export function RegionalCard({ currency, setCurrency }: RegionalCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle>Regional</CardTitle>
        <CardDescription>Moeda usada em todo o sistema (valores, finanças, metas).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="currency" className="text-muted-foreground">Moeda</Label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label} — {c.code}</option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 text-center sm:text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prévia</p>
          <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(1234.5, { currency })}</p>
        </div>
      </CardContent>
    </Card>
  );
}
