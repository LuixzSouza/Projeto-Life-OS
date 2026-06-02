// Cabeçalho de seção no padrão limpo do sistema.
export function SectionHeader({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint?: string }) {
    return (
        <div className="flex items-center gap-2 px-1">
            <Icon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
        </div>
    );
}
