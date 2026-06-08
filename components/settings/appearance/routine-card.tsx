import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Languages, BellRing } from "lucide-react";

const LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en-US", label: "English (US)" },
  { code: "es-ES", label: "Español" },
];

interface RoutineCardProps {
  workStart: string;
  setWorkStart: (v: string) => void;
  workEnd: string;
  setWorkEnd: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  reminderLead: number; // antecedência (min) do lembrete de blocos
}

export function RoutineCard({ workStart, setWorkStart, workEnd, setWorkEnd, language, setLanguage, reminderLead }: RoutineCardProps) {
  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" /> Rotina & Idioma
        </CardTitle>
        <CardDescription>Horário de trabalho (usado na Agenda), lembrete de blocos e idioma.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workStart" className="text-muted-foreground">Início do trabalho</Label>
          <Input
            id="workStart"
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            className="h-10 bg-muted/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workEnd" className="text-muted-foreground">Fim do trabalho</Label>
          <Input
            id="workEnd"
            type="time"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
            className="h-10 bg-muted/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reminderLeadMinutes" className="flex items-center gap-1.5 text-muted-foreground">
            <BellRing className="h-3.5 w-3.5" /> Lembrete de bloco (min antes)
          </Label>
          <Input
            id="reminderLeadMinutes"
            name="reminderLeadMinutes"
            type="number"
            min={5}
            max={180}
            step={5}
            defaultValue={reminderLead}
            className="h-10 bg-muted/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-1.5 text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> Idioma
          </Label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
