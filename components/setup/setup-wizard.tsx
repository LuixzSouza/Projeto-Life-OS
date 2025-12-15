"use client";

import { useState } from "react";
import { setupSystem } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    User, ArrowRight, Check, Cpu, Cloud, Moon, Sun, 
    Laptop, Briefcase, CheckCircle2, Terminal, Loader2,
    DollarSign, Clock, HardDrive, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Passos do Wizard
const STEPS = [
    { id: 1, label: "Perfil", icon: User },
    { id: 2, label: "Sistema", icon: Briefcase },
    { id: 3, label: "Inteligência", icon: Cpu },
    { id: 4, label: "Revisão", icon: CheckCircle2 },
];

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    currency: "BRL",
    workStart: "09:00",
    workEnd: "18:00",
    aiProvider: "ollama",
    theme: "system"
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));
  const goToStep = (s: number) => { if (s < step) setStep(s); };

  // Cálculo de progresso
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-5xl bg-background rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
      
      {/* --- SIDEBAR --- */}
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

      {/* --- CONTEÚDO DO FORMULÁRIO --- */}
      <div className="flex-1 p-6 md:p-10 flex flex-col bg-card">
        <form action={setupSystem} onSubmit={() => setIsLoading(true)} className="flex-1 flex flex-col justify-between h-full">
            
            {/* INPUTS OCULTOS */}
            <input type="hidden" name="name" value={formData.name} />
            <input type="hidden" name="bio" value={formData.bio} />
            <input type="hidden" name="currency" value={formData.currency} />
            <input type="hidden" name="workStart" value={formData.workStart} />
            <input type="hidden" name="workEnd" value={formData.workEnd} />
            <input type="hidden" name="aiProvider" value={formData.aiProvider} />
            <input type="hidden" name="theme" value={formData.theme} />

            <div className="space-y-8">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {step === 1 && "Olá! Quem é você?"}
                        {step === 2 && "Preferências do Sistema"}
                        {step === 3 && "Cérebro Digital"}
                        {step === 4 && "Tudo pronto?"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {step === 1 && "Vamos personalizar sua experiência inicial."}
                        {step === 2 && "Defina como o Life OS deve operar no seu dia a dia."}
                        {step === 3 && "Escolha o modelo de Inteligência Artificial."}
                        {step === 4 && "Revise suas escolhas antes de iniciar a jornada."}
                    </p>
                </div>

                <div className="min-h-[300px] pt-2">
                    {/* PASSO 1: PERFIL */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="grid gap-2">
                                <Label htmlFor="nameInput" className="text-foreground">Como você quer ser chamado?</Label>
                                <Input 
                                    id="nameInput"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: Luiz Souza" 
                                    className="h-12 text-lg bg-muted/30 border-border focus-visible:ring-primary" 
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bioInput" className="text-foreground">Qual seu foco atual?</Label>
                                <Input 
                                    id="bioInput"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    placeholder="Ex: Organizar finanças e finalizar a faculdade." 
                                    className="h-12 text-base bg-muted/30 border-border focus-visible:ring-primary" 
                                />
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: SISTEMA & ROTINA */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                            
                            {/* Moeda */}
                            <div className="space-y-3">
                                <Label className="text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4"/> Moeda Principal</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['BRL', 'USD', 'EUR'].map(curr => (
                                        <div
                                            key={curr}
                                            onClick={() => setFormData({...formData, currency: curr})}
                                            className={cn(
                                                "cursor-pointer flex items-center justify-center py-3 rounded-xl border-2 transition-all font-medium text-sm",
                                                formData.currency === curr 
                                                    ? "border-primary bg-primary/5 text-primary" 
                                                    : "border-border bg-card hover:bg-muted text-muted-foreground"
                                            )}
                                        >
                                            {curr}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tema */}
                            <div className="space-y-3">
                                <Label className="text-foreground flex items-center gap-2"><Laptop className="h-4 w-4"/> Aparência Inicial</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'light', icon: Sun, label: 'Claro' },
                                        { id: 'dark', icon: Moon, label: 'Escuro' },
                                        { id: 'system', icon: Laptop, label: 'Auto' }
                                    ].map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => setFormData({...formData, theme: t.id})}
                                            className={cn(
                                                "cursor-pointer flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                                                formData.theme === t.id 
                                                    ? "border-primary bg-primary/5 text-primary" 
                                                    : "border-border bg-card hover:bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <t.icon className="h-5 w-5" />
                                            <span className="text-xs font-medium">{t.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Horário */}
                            <div className="space-y-3">
                                <Label className="text-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Horário de Produtividade</Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="time" 
                                        value={formData.workStart} 
                                        onChange={(e) => setFormData({...formData, workStart: e.target.value})}
                                        className="bg-muted/30 border-border text-center font-mono" 
                                    />
                                    <span className="text-muted-foreground text-xs uppercase font-bold">até</span>
                                    <Input 
                                        type="time" 
                                        value={formData.workEnd} 
                                        onChange={(e) => setFormData({...formData, workEnd: e.target.value})}
                                        className="bg-muted/30 border-border text-center font-mono" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3: INTELIGÊNCIA */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div 
                                onClick={() => setFormData({...formData, aiProvider: 'ollama'})}
                                className={cn(
                                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    formData.aiProvider === 'ollama' 
                                        ? "border-primary bg-primary/5 shadow-sm" 
                                        : "border-border bg-card hover:bg-muted/50"
                                )}
                            >
                                <div className={cn("p-3 rounded-lg", formData.aiProvider === 'ollama' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                    <HardDrive className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-base text-foreground">Local (Ollama)</p>
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">RECOMENDADO</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Privacidade máxima. O modelo roda dentro do seu computador. Requer hardware decente.</p>
                                </div>
                                {formData.aiProvider === 'ollama' && <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center"><Check className="h-4 w-4 text-primary-foreground" /></div>}
                            </div>

                            <div 
                                onClick={() => setFormData({...formData, aiProvider: 'openai'})}
                                className={cn(
                                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    formData.aiProvider === 'openai' 
                                        ? "border-primary bg-primary/5 shadow-sm" 
                                        : "border-border bg-card hover:bg-muted/50"
                                )}
                            >
                                <div className={cn("p-3 rounded-lg", formData.aiProvider === 'openai' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                    <Cloud className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-base text-foreground">Nuvem (OpenAI)</p>
                                    <p className="text-sm text-muted-foreground mt-1">Mais inteligente e rápido. Requer chave de API e conexão com a internet.</p>
                                </div>
                                {formData.aiProvider === 'openai' && <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center"><Check className="h-4 w-4 text-primary-foreground" /></div>}
                            </div>
                        </div>
                    )}

                    {/* PASSO 4: RESUMO */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <Card className="p-6 bg-muted/20 border-border border-dashed">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-border border-dashed">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {formData.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{formData.name}</p>
                                                <p className="text-xs text-muted-foreground">{formData.bio}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block text-xs mb-1">Sistema</span>
                                            <span className="font-medium text-foreground flex items-center gap-1">
                                                <DollarSign className="h-3 w-3"/> {formData.currency} • {formData.theme}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs mb-1">Horário Foco</span>
                                            <span className="font-medium text-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3"/> {formData.workStart} - {formData.workEnd}
                                            </span>
                                        </div>
                                        <div className="col-span-2 pt-2">
                                            <span className="text-muted-foreground block text-xs mb-1">IA Configurada</span>
                                            <div className="flex items-center gap-2 bg-background p-2 rounded border border-border">
                                                {formData.aiProvider === 'ollama' ? <HardDrive className="h-4 w-4 text-primary"/> : <Cloud className="h-4 w-4 text-primary"/>}
                                                <span className="font-medium text-foreground capitalize">{formData.aiProvider === 'ollama' ? "Local (Ollama)" : "Nuvem (OpenAI)"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            
                            <div className="text-center space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Ao clicar em iniciar, seu banco de dados local será configurado.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÕES */}
            <div className="flex justify-between pt-6 border-t border-border mt-auto">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={prevStep} 
                    disabled={step === 1 || isLoading}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Voltar
                </Button>

                {step < 4 ? (
                    <Button 
                        type="button" 
                        onClick={nextStep} 
                        disabled={step === 1 && !formData.name}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[160px] shadow-lg transition-all"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isLoading ? "Configurando..." : "Iniciar Sistema"}
                    </Button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
}