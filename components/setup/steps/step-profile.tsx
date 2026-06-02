import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import type { SetupFormData } from "../wizard-types";

interface StepProfileProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

export function StepProfile({ formData, setFormData, showPassword, setShowPassword }: StepProfileProps) {
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
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
          <Label htmlFor="passwordInput">Senha Mestra</Label>
          <div className="relative">
            <Input
              id="passwordInput"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="h-12 pr-10 bg-muted/30 border-border"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Mín. 8 caracteres, com letras e números.</p>
        </div>
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
