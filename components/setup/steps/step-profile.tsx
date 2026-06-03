import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateStrongPassword } from "@/lib/password-generator";
import type { SetupFormData } from "../wizard-types";

interface StepProfileProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

/** Calcula um score simples de força (0-4) para o medidor visual. */
function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const SCORE_META = [
  { label: "Muito fraca", color: "bg-red-500", text: "text-red-500" },
  { label: "Fraca", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Razoável", color: "bg-yellow-500", text: "text-yellow-500" },
  { label: "Forte", color: "bg-lime-500", text: "text-lime-500" },
  { label: "Excelente", color: "bg-emerald-500", text: "text-emerald-500" },
];

export function StepProfile({ formData, setFormData, showPassword, setShowPassword }: StepProfileProps) {
  const [copied, setCopied] = useState(false);

  const score = useMemo(() => passwordScore(formData.password), [formData.password]);
  const meta = SCORE_META[score];

  const handleGenerate = () => {
    const pw = generateStrongPassword(16);
    setFormData({ ...formData, password: pw });
    setShowPassword(true);
    toast.success("Senha forte gerada! Copie e guarde em local seguro.");
  };

  const handleCopy = async () => {
    if (!formData.password) return;
    try {
      await navigator.clipboard.writeText(formData.password);
      setCopied(true);
      toast.success("Senha copiada.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="grid gap-2">
        <Label htmlFor="nameInput">Seu Nome Completo</Label>
        <Input
          id="nameInput"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Luiza"
          className="h-12 text-lg bg-muted/30 border-border"
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="emailInput">Email de Acesso</Label>
        <Input
          id="emailInput"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="admin@lifeos.local"
          className="h-12 bg-muted/30 border-border"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="passwordInput">Senha Mestra</Label>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" /> Gerar senha forte
          </button>
        </div>
        <div className="relative">
          <Input
            id="passwordInput"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            className="h-12 pr-20 bg-muted/30 border-border font-mono"
            required
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {formData.password && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                title="Copiar senha"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              title={showPassword ? "Ocultar" : "Mostrar"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Medidor de força */}
        {formData.password ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < score ? meta.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className={cn("text-[11px] font-medium", meta.text)}>
              Força: {meta.label}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Mín. 8 caracteres, com letras e números.</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bioInput">Foco Principal (Opcional)</Label>
        <Input
          id="bioInput"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Ex: Produtividade e Estudos"
          className="h-12 text-base bg-muted/30 border-border"
        />
      </div>
    </div>
  );
}
