import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FolderInput, Cloud, CheckCircle2, Lock, Info } from "lucide-react";
import { FolderPicker } from "@/components/settings/folder-picker";
import {
  DB_PROVIDERS,
  type SetupFormData,
  type DbProviderId,
  type DbProviderMeta,
} from "../wizard-types";

interface StepSystemProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
  setDbProvider: (id: DbProviderId) => void;
  dbFromEnv?: boolean;
}

export function StepSystem({ formData, setFormData, setDbProvider, dbFromEnv }: StepSystemProps) {
  // --- Caso 1: deploy web — banco já definido pelas env vars (Turso) ---
  if (dbFromEnv) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex items-start gap-4 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
            <Cloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground">Banco na nuvem (Turso) já configurado</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este ambiente já está conectado a um banco Turso através das variáveis
              de ambiente do servidor. Você não precisa informar nada aqui — é só
              continuar.
            </p>
          </div>
        </div>

        {/* Showcase: Turso ativo + demais provedores no roadmap ("Em breve"). */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Provedores de banco
          </p>
          <ProviderGrid providers={DB_PROVIDERS} selectedId="turso" mode="showcase" />
        </div>

        <WorkPreferences formData={formData} setFormData={setFormData} />
      </div>
    );
  }

  // --- Caso 2: escolha do provedor (desktop / local dev) ---
  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
      <ProviderGrid
        providers={DB_PROVIDERS}
        selectedId={formData.dbProvider}
        onSelect={setDbProvider}
        mode="interactive"
      />

      {/* Descrição do provedor selecionado */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>{DB_PROVIDERS.find((p) => p.id === formData.dbProvider)?.description}</span>
      </div>

      {/* Painel de configuração do provedor ativo */}
      {formData.dbProvider === "turso" && (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
          <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <Cloud className="h-4 w-4" /> Conexão com o Turso
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crie um banco grátis em{" "}
            <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              turso.tech
            </a>{" "}
            e cole a URL e o token de autenticação.
          </p>
          <div className="grid gap-3 pt-1">
            <div className="grid gap-1.5">
              <Label htmlFor="tursoUrl" className="text-[11px] font-semibold uppercase text-muted-foreground">URL do Banco</Label>
              <Input
                id="tursoUrl"
                value={formData.tursoUrl}
                onChange={(e) => setFormData({ ...formData, tursoUrl: e.target.value })}
                placeholder="libsql://seu-banco.turso.io"
                className="bg-background font-mono text-xs border-border h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tursoToken" className="text-[11px] font-semibold uppercase text-muted-foreground">
                Token de Autenticação
              </Label>
              <Input
                id="tursoToken"
                type="password"
                value={formData.tursoToken}
                onChange={(e) => setFormData({ ...formData, tursoToken: e.target.value })}
                placeholder="eyJhbGciOi..."
                className="bg-background font-mono text-xs border-border h-10"
              />
              <p className="text-[10px] text-amber-600/90">
                ⚠️ O token começa com <code>eyJ…</code> — não é a URL. Gere com{" "}
                <code>turso db tokens create &lt;nome&gt;</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {formData.dbProvider === "local" && (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
          <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <FolderInput className="h-4 w-4" /> Localização do Banco
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O arquivo <code>life_os.db</code> será criado nesta pasta. (Disponível
            apenas no app desktop — no deploy web use o Turso.)
          </p>
          <div className="flex gap-2 pt-1">
            <div className="relative flex-1">
              <FolderInput className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
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
        </div>
      )}

      <WorkPreferences formData={formData} setFormData={setFormData} />
    </div>
  );
}

// =========================================================
// GRADE DE PROVEDORES (compartilhada pelos dois modos)
// =========================================================
// - "interactive" (desktop/dev): cards selecionáveis; indisponíveis = "Em breve".
// - "showcase" (deploy web): destino já fixado pelo ambiente; o provedor ativo
//   aparece como "Ativo" e todos os demais ficam travados em "Em breve".
type GridMode = "interactive" | "showcase";

function ProviderGrid({
  providers,
  selectedId,
  onSelect,
  mode,
}: {
  providers: DbProviderMeta[];
  selectedId: DbProviderId;
  onSelect?: (id: DbProviderId) => void;
  mode: GridMode;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {providers.map((p) => {
        const active = mode === "showcase" && p.id === selectedId;
        const selected = mode === "interactive" && selectedId === p.id;
        // Em showcase só o provedor ativo é interativo; o resto fica travado.
        const disabled = mode === "showcase" ? !active : !p.available;
        const badge = active ? "Ativo" : p.badge;

        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => mode === "interactive" && !disabled && onSelect?.(p.id)}
            title={p.description}
            className={cn(
              "relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all",
              active
                ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm cursor-default"
                : disabled
                  ? "border-border bg-muted/10 opacity-60 cursor-not-allowed"
                  : selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            {/* Badge canto superior direito */}
            {badge && (
              <span
                className={cn(
                  "absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  active
                    ? "bg-emerald-500/20 text-emerald-600"
                    : disabled
                      ? "bg-muted text-muted-foreground"
                      : badge === "Recomendado"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-sky-500/15 text-sky-600"
                )}
              >
                {badge}
              </span>
            )}
            <p.icon
              className={cn(
                "h-5 w-5",
                active ? "text-emerald-500" : disabled ? "text-muted-foreground" : selected ? "text-primary" : p.accent
              )}
            />
            <span className="text-sm font-semibold text-foreground flex items-center gap-1">
              {p.name}
              {active ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              ) : (
                disabled && <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">{p.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- Sub-bloco: horário de trabalho + moeda (comum aos dois casos) ---
function WorkPreferences({
  formData,
  setFormData,
}: {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Horário de Trabalho</Label>
        <div className="flex items-center gap-2">
          <Input type="time" value={formData.workStart} onChange={(e) => setFormData({ ...formData, workStart: e.target.value })} className="bg-muted/30" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="time" value={formData.workEnd} onChange={(e) => setFormData({ ...formData, workEnd: e.target.value })} className="bg-muted/30" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Moeda</Label>
        <div className="flex gap-2">
          {["BRL", "USD", "EUR"].map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setFormData({ ...formData, currency: c })}
              className={cn(
                "px-3 py-2 rounded border text-sm transition-colors",
                formData.currency === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
