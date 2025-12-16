import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortfolioData } from "@/types/portfolio";

export function HeroForm({ data, onChange }: { data: PortfolioData, onChange: (d: PortfolioData) => void }) {
    const update = (field: string, value: string) => {
        onChange({
            ...data,
            hero: { ...data.hero, [field]: value }
        });
    };

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <Label className="text-xs">Nome Completo</Label>
                <Input value={data.hero.name} onChange={e => update('name', e.target.value)} placeholder="Ex: Ana Silva" />
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Headline (Cargo / Especialidade)</Label>
                <Input value={data.hero.headline} onChange={e => update('headline', e.target.value)} placeholder="Ex: Senior Frontend Engineer | React Specialist" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={data.hero.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input value={data.hero.phone} onChange={e => update('phone', e.target.value)} />
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Resumo (Curto - 2 linhas)</Label>
                <Textarea 
                    value={data.about.short} 
                    onChange={e => onChange({ ...data, about: { ...data.about, short: e.target.value } })} 
                    className="h-20 resize-none"
                    placeholder="Resumo de impacto para o cabeçalho..."
                />
            </div>
        </div>
    );
}