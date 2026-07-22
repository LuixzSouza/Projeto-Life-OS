import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Mail, Image as ImageIcon, Upload, Trash2, Wand2 } from "lucide-react";
import { hexToHsl } from "@/lib/color";
import { ART_PRESETS, generateGradientCover, generateInitialsAvatar, nameInitials } from "@/lib/profile-art";

interface ProfileIdentityCardProps {
  name: string;
  setName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  userEmail?: string | null;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  coverUrl: string;
  setCoverUrl: (v: string) => void;
  isPreset: boolean;
  customColorInput: string;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onImageProcess: (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => void;
}

export function ProfileIdentityCard({
  name,
  setName,
  bio,
  setBio,
  userEmail,
  avatarUrl,
  setAvatarUrl,
  coverUrl,
  setCoverUrl,
  isPreset,
  customColorInput,
  avatarInputRef,
  coverInputRef,
  onImageProcess,
}: ProfileIdentityCardProps) {
  // Cicla os presets a cada clique em "Gerar" — repetir o clique troca o estilo.
  const [coverArtIdx, setCoverArtIdx] = useState(0);
  const [avatarArtIdx, setAvatarArtIdx] = useState(0);

  const generateCover = (presetIdx?: number) => {
    const preset = ART_PRESETS[(presetIdx ?? coverArtIdx) % ART_PRESETS.length];
    const art = generateGradientCover(preset);
    if (art) setCoverUrl(art);
    if (presetIdx === undefined) setCoverArtIdx((i) => i + 1);
  };

  const generateAvatar = () => {
    const preset = ART_PRESETS[avatarArtIdx % ART_PRESETS.length];
    const art = generateInitialsAvatar(name, preset);
    if (art) setAvatarUrl(art);
    setAvatarArtIdx((i) => i + 1);
  };

  return (
    <Card className="overflow-hidden border-border shadow-sm bg-card group/card">
      <div className="relative h-52 w-full overflow-hidden group/cover rounded-t-lg bg-muted">
        {coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/cover:scale-105"
            style={{ backgroundImage: `url(${coverUrl})` }}
          >
            <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" />
          </div>
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-muted/50 pattern-grid-white/10"
            style={!isPreset ? ({ '--primary': hexToHsl(customColorInput).cssValue } as React.CSSProperties) : undefined}
          />
        )}

        {/* Sem capa: estilos prontos visíveis direto (sem depender de hover — mobile) */}
        {!coverUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full">
              Envie uma foto ou gere um estilo
            </span>
            <div className="flex gap-2.5">
              {ART_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  type="button"
                  title={`Capa ${preset.label}`}
                  onClick={() => generateCover(idx)}
                  className="h-9 w-9 rounded-full border-2 border-background/80 shadow-md hover:scale-110 hover:border-background transition-all"
                  style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-all duration-300 translate-y-2 group-hover/cover:translate-y-0">
          {coverUrl && (
            <Button
              type="button" variant="secondary" size="sm"
              className="bg-background/70 hover:bg-background/90 backdrop-blur-md shadow-sm h-9 px-3 text-xs font-medium border-0"
              onClick={() => generateCover()}
              title="Gerar outra capa em gradiente"
            >
              <Wand2 className="h-3.5 w-3.5 mr-2 text-primary" />
              Gerar
            </Button>
          )}
          <Button
            type="button" variant="secondary" size="sm"
            className="bg-background/70 hover:bg-background/90 backdrop-blur-md shadow-sm h-9 px-3 text-xs font-medium border-0"
            onClick={() => coverInputRef.current?.click()}
          >
            <ImageIcon className="h-3.5 w-3.5 mr-2 text-primary" />
            {coverUrl ? "Alterar Capa" : "Adicionar Capa"}
          </Button>

          {coverUrl && (
            <Button
              type="button" variant="destructive" size="icon"
              aria-label="Remover capa"
              className="h-9 w-9 shadow-sm opacity-80 hover:opacity-100 backdrop-blur-md"
              onClick={() => {
                setCoverUrl("");
                if (coverInputRef.current) coverInputRef.current.value = "";
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <input type="file" ref={coverInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => onImageProcess(e, true)} />
        <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => onImageProcess(e, false)} />
      </div>

      <CardContent className="relative px-8 pb-10">
        <div className="flex flex-col md:flex-row gap-8 -mt-20 items-start">
          <div className="flex flex-col items-center gap-3 shrink-0 relative z-10">
            <div
              role="button"
              tabIndex={0}
              aria-label="Trocar foto de perfil"
              onClick={() => avatarInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  avatarInputRef.current?.click();
                }
              }}
              className="relative group/avatar cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-36 w-36 border-[6px] border-card shadow-xl bg-muted">
                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                  {nameInitials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity border-[6px] border-transparent backdrop-blur-[1px]">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Editar</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => avatarInputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> Foto
              </Button>
              <Button
                type="button" variant="outline" size="sm" className="h-7 text-xs"
                onClick={generateAvatar}
                title="Gerar avatar com suas iniciais — clique de novo para trocar a cor"
              >
                <Wand2 className="h-3 w-3 mr-1" /> Gerar
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setAvatarUrl("")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 w-full pt-4 md:pt-20 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-muted-foreground"><User className="h-3.5 w-3.5" /> Nome de Exibição</Label>
                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 focus-visible:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input id="email" name="email" defaultValue={userEmail || ""} readOnly className="bg-muted/50 opacity-70 cursor-not-allowed border-dashed" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-muted-foreground">Bio / Objetivo</Label>
              <Textarea id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted/30 min-h-[80px] resize-none focus-visible:ring-primary" placeholder="O que você está focando no momento?" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
