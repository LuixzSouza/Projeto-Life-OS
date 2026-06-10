"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { useThemeColor } from "@/components/providers/theme-color-provider";
import { hexToHsl } from "@/lib/color";
import { compressImageFile } from "@/lib/image";

import { THEME_PRESETS } from "@/components/settings/appearance/theme-presets";
import { ProfileIdentityCard } from "@/components/settings/appearance/profile-identity-card";
import { ProfileStrengthCard } from "@/components/settings/appearance/profile-strength-card";
import { ThemePaletteCard } from "@/components/settings/appearance/theme-palette-card";
import { AppearanceModeCard } from "@/components/settings/appearance/appearance-mode-card";
import { RegionalCard } from "@/components/settings/appearance/regional-card";
import { RoutineCard } from "@/components/settings/appearance/routine-card";
import { BillingCard } from "@/components/settings/appearance/billing-card";

interface AppearanceFormProps {
  initialColor?: string | null;
  initialCurrency?: string | null;
  initialPixKey?: string | null;
  initialBusinessName?: string | null;
  initialLanguage?: string | null;
  initialWorkStart?: string | null;
  initialWorkEnd?: string | null;
  initialReminderLead?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
  userBio?: string | null;
  userCover?: string | null;
}

export default function AppearanceForm({
  initialCurrency,
  initialPixKey,
  initialBusinessName,
  initialLanguage,
  initialWorkStart,
  initialWorkEnd,
  initialReminderLead,
  userName,
  userEmail,
  userAvatar,
  userBio,
  userCover
}: AppearanceFormProps) {
  const { setTheme, theme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [isLoading, setIsLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(userName || "");
  const [avatarUrl, setAvatarUrl] = useState(userAvatar || "");
  const [coverUrl, setCoverUrl] = useState(userCover || "");
  const [bio, setBio] = useState(userBio || "");
  const [currency, setCurrency] = useState(initialCurrency || "BRL");
  const [pixKey, setPixKey] = useState(initialPixKey || "");
  const [businessName, setBusinessName] = useState(initialBusinessName || "");
  const [language, setLanguage] = useState(initialLanguage || "pt-BR");
  const [workStart, setWorkStart] = useState(initialWorkStart || "09:00");
  const [workEnd, setWorkEnd] = useState(initialWorkEnd || "18:00");

  const isPreset = THEME_PRESETS.some(c => c.name === themeColor);

  // Estado da cor customizada
  const [customColorInput, setCustomColorInput] = useState(!isPreset && themeColor ? themeColor : "#000000");

  // Aplicação dinâmica da cor customizada (compatível com o CSS de presets)
  useEffect(() => {
    const root = document.documentElement;

    if (!isPreset && themeColor && themeColor.startsWith('#')) {
      const { l, cssValue } = hexToHsl(themeColor);

      root.style.setProperty('--primary', cssValue);
      root.style.setProperty('--ring', cssValue);

      // Cálculo de contraste do texto sobre a cor primária
      if (l > 60) {
        root.style.setProperty('--primary-foreground', 'hsl(222.2 47.4% 11.2%)');
      } else {
        root.style.setProperty('--primary-foreground', 'hsl(210 40% 98%)');
      }
    } else {
      // Remove inline styles para a classe de preset (theme-blue, etc) assumir
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--primary-foreground');
    }
  }, [themeColor, isPreset]);

  const handleImageProcess = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Limite generoso na entrada — a imagem é comprimida antes de salvar.
    const limit = isCover ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(`A imagem é muito grande. Máximo de ${isCover ? '15MB' : '10MB'}.`);
      input.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      input.value = "";
      return;
    }

    try {
      // Capa: maior e mais larga. Avatar: menor e quadrado.
      const compressed = await compressImageFile(
        file,
        isCover ? { maxDimension: 1600, quality: 0.82 } : { maxDimension: 512, quality: 0.85 }
      );
      if (isCover) setCoverUrl(compressed);
      else setAvatarUrl(compressed);
    } catch {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      // Permite reenviar o mesmo arquivo (dispara o onChange novamente).
      input.value = "";
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomColorInput(hex);
    setThemeColor(hex);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    formData.set("accentColor", themeColor);
    formData.set("currency", currency);
    // Tema (claro/escuro) agora persiste no banco junto do perfil.
    if (theme) formData.set("theme", theme);
    formData.set("language", language);
    formData.set("workStart", workStart);
    formData.set("workEnd", workEnd);

    // Sempre persiste o estado atual (string vazia limpa a imagem no banco).
    formData.set("avatarUrl", avatarUrl || "");
    formData.set("coverUrl", coverUrl || "");

    try {
      await updateSettings(formData);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <ProfileStrengthCard
        name={name}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        bio={bio}
        pixKey={pixKey}
      />

      <ProfileIdentityCard
        name={name}
        setName={setName}
        bio={bio}
        setBio={setBio}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        coverUrl={coverUrl}
        setCoverUrl={setCoverUrl}
        isPreset={isPreset}
        customColorInput={customColorInput}
        avatarInputRef={avatarInputRef}
        coverInputRef={coverInputRef}
        onImageProcess={handleImageProcess}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ThemePaletteCard
          themeColor={themeColor}
          isPreset={isPreset}
          customColorInput={customColorInput}
          onPresetSelect={setThemeColor}
          onCustomColorChange={handleCustomColorChange}
        />
        <AppearanceModeCard theme={theme} setTheme={setTheme} />
      </div>

      <RegionalCard currency={currency} setCurrency={setCurrency} />

      <RoutineCard
        workStart={workStart}
        setWorkStart={setWorkStart}
        workEnd={workEnd}
        setWorkEnd={setWorkEnd}
        language={language}
        setLanguage={setLanguage}
        reminderLead={initialReminderLead ?? 30}
      />

      <BillingCard
        pixKey={pixKey}
        setPixKey={setPixKey}
        businessName={businessName}
        setBusinessName={setBusinessName}
      />

      <div className="flex justify-end pt-4 border-t border-border">
        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto shadow-lg transition-all hover:scale-[1.02] bg-primary text-primary-foreground hover:bg-primary/90">
          {isLoading ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</span>) : ("Salvar Alterações")}
        </Button>
      </div>
    </form>
  );
}
