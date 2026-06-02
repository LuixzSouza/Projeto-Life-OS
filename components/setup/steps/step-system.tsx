import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HardDrive, FolderInput, Cloud } from "lucide-react";
import { FolderPicker } from "@/components/settings/folder-picker";
import type { SetupFormData } from "../wizard-types";

interface StepSystemProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
}

export function StepSystem({ formData, setFormData }: StepSystemProps) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
      {/* Seletor de modo de armazenamento (híbrido) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, storageMode: "local" })}
          className={cn(
            "flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all",
            formData.storageMode === "local"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-muted/20 hover:border-primary/30"
          )}
        >
          <HardDrive className={cn("h-5 w-5", formData.storageMode === "local" ? "text-primary" : "text-muted-foreground")} />
          <span className="text-sm font-semibold text-foreground">Pasta local (SQLite)</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            Seus dados ficam num arquivo no seu computador. Privado e portátil.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormData({ ...formData, storageMode: "cloud" })}
          className={cn(
            "flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all",
            formData.storageMode === "cloud"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-muted/20 hover:border-primary/30"
          )}
        >
          <Cloud className={cn("h-5 w-5", formData.storageMode === "cloud" ? "text-primary" : "text-muted-foreground")} />
          <span className="text-sm font-semibold text-foreground">Banco na nuvem (Turso)</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            Sincronize entre dispositivos. Ideal para deploy (Vercel) e acesso web.
          </span>
        </button>
      </div>

      {formData.storageMode === "local" ? (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
          <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
            <HardDrive className="h-5 w-5" /> Localização do Banco de Dados
          </Label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O arquivo <code>life_os.db</code> será criado nesta pasta.
          </p>
          <div className="grid gap-2 pt-2">
            <Label htmlFor="storagePath" className="text-xs font-semibold uppercase text-muted-foreground">Caminho da Pasta</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderInput className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="storagePath"
                  value={formData.storagePath}
                  onChange={(e) => setFormData({ ...formData, storagePath: e.target.value })}
                  placeholder="Ex: C:\LifeOS_Data"
                  className="pl-9 bg-background font-mono text-xs border-border h-10"
                />
              </div>

              <div className="shrink-0">
                <FolderPicker
                  currentPath={formData.storagePath}
                  onSelect={(newPath) => setFormData({ ...formData, storagePath: newPath })}
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">Dica: Use um caminho curto e sem espaços se possível (ex: C:\LifeOS).</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
          <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
            <Cloud className="h-5 w-5" /> Conexão com o Turso
          </Label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Crie um banco grátis em{" "}
            <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              turso.tech
            </a>{" "}
            e cole a URL e o token de autenticação do banco.
          </p>
          <div className="grid gap-3 pt-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tursoUrl" className="text-xs font-semibold uppercase text-muted-foreground">URL do Banco</Label>
              <Input
                id="tursoUrl"
                value={formData.tursoUrl}
                onChange={(e) => setFormData({ ...formData, tursoUrl: e.target.value })}
                placeholder="libsql://seu-banco.turso.io"
                className="bg-background font-mono text-xs border-border h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tursoToken" className="text-xs font-semibold uppercase text-muted-foreground">Token de Autenticação</Label>
              <Input
                id="tursoToken"
                type="password"
                value={formData.tursoToken}
                onChange={(e) => setFormData({ ...formData, tursoToken: e.target.value })}
                placeholder="eyJhbGciOi..."
                className="bg-background font-mono text-xs border-border h-10"
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Gere o token com <code>turso db tokens create &lt;nome&gt;</code> ou no painel do Turso.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Horário de Trabalho</Label>
          <div className="flex items-center gap-2">
            <Input type="time" value={formData.workStart} onChange={(e) => setFormData({ ...formData, workStart: e.target.value })} className="bg-muted/30" />
            <span>até</span>
            <Input type="time" value={formData.workEnd} onChange={(e) => setFormData({ ...formData, workEnd: e.target.value })} className="bg-muted/30" />
          </div>
        </div>
        <div className="space-y-3">
          <Label>Moeda</Label>
          <div className="flex gap-2">
            {['BRL', 'USD', 'EUR'].map(c => (
              <div key={c} onClick={() => setFormData({ ...formData, currency: c })}
                className={cn("cursor-pointer px-3 py-2 rounded border text-sm", formData.currency === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground")}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
