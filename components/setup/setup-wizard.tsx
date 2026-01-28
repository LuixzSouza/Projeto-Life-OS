"use client";

import { useState } from "react";
// CORREÇÃO: Importar do caminho exato onde criamos o arquivo
import { setupSystem } from "@/app/actions/setup"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    User, ArrowRight, Check, Cpu, Cloud, 
    Laptop, Briefcase, CheckCircle2, Terminal, Loader2,
    DollarSign, Clock, HardDrive, Sparkles, FolderInput,
    Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FolderPicker } from "@/components/settings/folder-picker"; 

// Passos do Wizard
const STEPS = [
    { id: 1, label: "Perfil & Acesso", icon: User },
    { id: 2, label: "Sistema & Dados", icon: Briefcase },
    { id: 3, label: "Inteligência", icon: Cpu },
    { id: 4, label: "Revisão", icon: CheckCircle2 },
];

export function SetupWizard() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Estado central do formulário
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        bio: "",
        currency: "BRL",
        workStart: "09:00",
        workEnd: "18:00",
        aiProvider: "ollama",
        theme: "system",
        storagePath: "C:\\LifeOS_Data", // Padrão Windows (escapado para JS)
    });

    const nextStep = () => {
        // Validação do Passo 1
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.password) {
                 toast.error("Por favor, preencha Nome, Email e Senha.");
                 return;
            }
        }
        // Validação do Passo 2
        if (step === 2) {
             if (!formData.storagePath) {
                 toast.error("O caminho do banco de dados é obrigatório.");
                 return;
            }
        }
        setStep((s) => Math.min(s + 1, 4));
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 1));
    const goToStep = (s: number) => { if (s < step) setStep(s); };

    // Cálculo de progresso visual
    const progress = ((step - 1) / (STEPS.length - 1)) * 100;

    return (
        <div className="w-full max-w-5xl bg-background rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
            
            {/* --- SIDEBAR (Lateral Esquerda) --- */}
            <div className="w-full md:w-72 bg-muted/30 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
                <div>
                    <div className="flex items-center gap-3 mb-10 text-primary">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Terminal className="h-6 w-6" />
                        </div>
                        <span className="font-bold tracking-tight text-xl text-foreground">Life OS</span>
                    </div>

                    <nav className="space-y-2">
                        {STEPS.map((s) => (
                            <div 
                                key={s.id} 
                                onClick={() => goToStep(s.id)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none",
                                    step === s.id 
                                        ? "bg-background text-primary shadow-sm ring-1 ring-border cursor-default" 
                                        : step > s.id 
                                            ? "text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/50"
                                            : "text-muted-foreground/50 cursor-not-allowed"
                                )}
                            >
                                <s.icon className={cn("h-4 w-4 transition-colors", step === s.id ? "text-primary" : step > s.id ? "text-primary/70" : "text-muted-foreground/50")} />
                                {s.label}
                                {step > s.id && <Check className="ml-auto h-3 w-3 text-primary" />}
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="hidden md:block">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
                        <span>Progresso</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            {/* --- CONTEÚDO DO FORMULÁRIO (Direita) --- */}
            <div className="flex-1 p-6 md:p-10 flex flex-col bg-card">
                <form 
                    action={setupSystem} 
                    onSubmit={() => setIsLoading(true)} 
                    className="flex-1 flex flex-col justify-between h-full"
                >
                    {/* INPUTS OCULTOS: Crucial para passar o state React para o FormData da Server Action */}
                    <input type="hidden" name="name" value={formData.name} />
                    <input type="hidden" name="email" value={formData.email} />
                    <input type="hidden" name="password" value={formData.password} />
                    <input type="hidden" name="bio" value={formData.bio} />
                    <input type="hidden" name="currency" value={formData.currency} />
                    <input type="hidden" name="workStart" value={formData.workStart} />
                    <input type="hidden" name="workEnd" value={formData.workEnd} />
                    <input type="hidden" name="aiProvider" value={formData.aiProvider} />
                    <input type="hidden" name="theme" value={formData.theme} />
                    <input type="hidden" name="storagePath" value={formData.storagePath} />

                    <div className="space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {step === 1 && "Olá! Crie seu Perfil Admin."}
                                {step === 2 && "Localização dos Dados"}
                                {step === 3 && "Cérebro Digital (IA)"}
                                {step === 4 && "Revisão Final"}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {step === 1 && "Configure sua credencial mestre de acesso."}
                                {step === 2 && "Defina onde o banco de dados (SQLite) será salvo."}
                                {step === 3 && "Escolha o motor de inteligência do sistema."}
                                {step === 4 && "Tudo pronto. Vamos inicializar o Life OS."}
                            </p>
                        </div>

                        <div className="min-h-[300px] pt-2">
                            
                            {/* === PASSO 1: PERFIL === */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nameInput">Seu Nome Completo</Label>
                                        <Input 
                                            id="nameInput"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                    placeholder="••••••••" 
                                                    className="h-12 pr-10 bg-muted/30 border-border" 
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="bioInput">Foco Principal (Opcional)</Label>
                                        <Input 
                                            id="bioInput"
                                            value={formData.bio}
                                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                            placeholder="Ex: Produtividade e Estudos" 
                                            className="h-12 text-base bg-muted/30 border-border" 
                                        />
                                    </div>
                                </div>
                            )}

                            {/* === PASSO 2: DADOS & SISTEMA (COM FOLDER PICKER) === */}
                            {step === 2 && (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                                        <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
                                            <HardDrive className="h-5 w-5"/> Localização do Banco de Dados
                                        </Label>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            O arquivo <code>life_os.db</code> será criado nesta pasta.
                                        </p>
                                        <div className="grid gap-2 pt-2">
                                            <Label htmlFor="storagePath" className="text-xs font-semibold uppercase text-muted-foreground">Caminho da Pasta</Label>
                                            <div className="flex gap-2">
                                                {/* Input Manual */}
                                                <div className="relative flex-1">
                                                    <FolderInput className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="storagePath"
                                                        value={formData.storagePath} 
                                                        onChange={(e) => setFormData({...formData, storagePath: e.target.value})} 
                                                        placeholder="Ex: C:\LifeOS_Data" 
                                                        className="pl-9 bg-background font-mono text-xs border-border h-10" 
                                                    />
                                                </div>
                                                
                                                {/* Componente FolderPicker Integrado */}
                                                <div className="shrink-0">
                                                    <FolderPicker 
                                                        currentPath={formData.storagePath} 
                                                        onSelect={(newPath) => setFormData({...formData, storagePath: newPath})}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Dica: Use um caminho curto e sem espaços se possível (ex: C:\LifeOS).</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                             <Label>Horário de Trabalho</Label>
                                             <div className="flex items-center gap-2">
                                                <Input type="time" value={formData.workStart} onChange={(e) => setFormData({...formData, workStart: e.target.value})} className="bg-muted/30" />
                                                <span>até</span>
                                                <Input type="time" value={formData.workEnd} onChange={(e) => setFormData({...formData, workEnd: e.target.value})} className="bg-muted/30" />
                                             </div>
                                        </div>
                                         <div className="space-y-3">
                                             <Label>Moeda</Label>
                                             <div className="flex gap-2">
                                                 {['BRL', 'USD', 'EUR'].map(c => (
                                                     <div key={c} onClick={() => setFormData({...formData, currency: c})} 
                                                          className={cn("cursor-pointer px-3 py-2 rounded border text-sm", formData.currency === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground")}>
                                                         {c}
                                                     </div>
                                                 ))}
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* === PASSO 3: INTELIGÊNCIA === */}
                            {step === 3 && (
                                <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div 
                                        onClick={() => setFormData({...formData, aiProvider: 'ollama'})}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            formData.aiProvider === 'ollama' ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-lg", formData.aiProvider === 'ollama' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                            <HardDrive className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-base text-foreground">Local (Ollama)</p>
                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">OFFLINE</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">Privacidade total. Requer software Ollama instalado.</p>
                                        </div>
                                        {formData.aiProvider === 'ollama' && <Check className="h-5 w-5 text-primary" />}
                                    </div>

                                    <div 
                                        onClick={() => setFormData({...formData, aiProvider: 'openai'})}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            formData.aiProvider === 'openai' ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-lg", formData.aiProvider === 'openai' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                            <Cloud className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-base text-foreground">Nuvem (OpenAI)</p>
                                            <p className="text-sm text-muted-foreground mt-1">Mais inteligente. Requer chave de API e internet.</p>
                                        </div>
                                        {formData.aiProvider === 'openai' && <Check className="h-5 w-5 text-primary" />}
                                    </div>
                                </div>
                            )}

                            {/* === PASSO 4: REVISÃO === */}
                            {step === 4 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <Card className="p-6 bg-muted/20 border-border border-dashed">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
                                                {formData.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{formData.name}</h3>
                                                <p className="text-sm text-muted-foreground">{formData.email}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="bg-background p-3 rounded border border-border">
                                                <span className="text-xs text-muted-foreground block mb-1">Banco de Dados</span>
                                                <code className="text-primary font-mono">{formData.storagePath}\life_os.db</code>
                                            </div>
                                            <div className="bg-background p-3 rounded border border-border">
                                                <span className="text-xs text-muted-foreground block mb-1">IA Provider</span>
                                                <span className="font-medium capitalize">{formData.aiProvider}</span>
                                            </div>
                                            <div className="bg-background p-3 rounded border border-border">
                                                <span className="text-xs text-muted-foreground block mb-1">Moeda & Tema</span>
                                                <span className="font-medium">{formData.currency} • {formData.theme}</span>
                                            </div>
                                            <div className="bg-background p-3 rounded border border-border">
                                                <span className="text-xs text-muted-foreground block mb-1">Horário</span>
                                                <span className="font-medium">{formData.workStart} - {formData.workEnd}</span>
                                            </div>
                                        </div>
                                    </Card>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Ao clicar abaixo, o sistema será configurado e iniciado.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTÕES DE NAVEGAÇÃO */}
                    <div className="flex justify-between pt-6 border-t border-border mt-auto">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={prevStep} 
                            disabled={step === 1 || isLoading}
                        >
                            Voltar
                        </Button>

                        {step < 4 ? (
                            <Button type="button" onClick={nextStep}>
                                Continuar <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[160px] shadow-lg"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isLoading ? "Instalando..." : "Instalar Sistema"}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}