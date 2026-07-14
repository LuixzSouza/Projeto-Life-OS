"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Youtube, X, Check, AlertCircle, Image as ImageIcon,
  Trash2, ExternalLink,
} from "lucide-react";
import {
  getAllMedia, persistMedia, setImageFor, setVideoFor,
  parseYouTubeId, youtubeThumb, youtubeEmbed,
} from "./session/exercise-media";
import { ExerciseThumb } from "./session/exercise-thumb";
import { MUSCLE_META, groupOfExercise } from "./exercise-db";
import { compressImage } from "@/lib/image-compress";

export function ExerciseMediaEditor({
  exerciseName,
  open,
  onOpenChange,
}: {
  exerciseName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [mediaMap, setMediaMap] = useState(() => getAllMedia());
  const [ytInput, setYtInput] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const media = mediaMap[exerciseName.trim().toLowerCase()] || {};
  const group = groupOfExercise(exerciseName);
  const color = (group && MUSCLE_META[group]?.color) || "#6366f1";

  // Persist quando fecha o modal
  useEffect(() => {
    if (!open) return;
    persistMedia(mediaMap);
  }, [open, mediaMap]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setMediaMap((m) => setImageFor(m, exerciseName, compressed));
      toast.success("Foto adicionada! ✨");
    } catch (e) {
      toast.error("Erro ao processar imagem");
      console.error(e);
    }
  };

  const handleYouTubeAdd = async () => {
    setYtError("");
    if (!ytInput.trim()) {
      setYtError("Cole um link ou ID do YouTube");
      return;
    }

    const id = parseYouTubeId(ytInput);
    if (!id) {
      setYtError("Link do YouTube inválido");
      return;
    }

    setYtLoading(true);
    try {
      // Testa se o vídeo existe tentando carregar a thumbnail
      const thumb = youtubeThumb(id);
      const img = new Image();
      img.onerror = () => {
        setYtError("Vídeo não encontrado ou privado");
        setYtLoading(false);
      };
      img.onload = () => {
        setMediaMap((m) => setVideoFor(m, exerciseName, id));
        setYtInput("");
        setYtLoading(false);
        toast.success("Vídeo adicionado! 🎬");
      };
      img.src = thumb;
    } catch (e) {
      setYtError("Erro ao validar vídeo");
      setYtLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setMediaMap((m) => setImageFor(m, exerciseName, null));
    toast.success("Foto removida");
  };

  const handleRemoveVideo = () => {
    setMediaMap((m) => setVideoFor(m, exerciseName, null));
    toast.success("Vídeo removido");
  };

  const handleClearAll = () => {
    setMediaMap((m) => {
      const next = { ...m };
      delete next[exerciseName.trim().toLowerCase()];
      return next;
    });
    toast.success("Todas as mídias removidas");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            Gerenciar imagem: <span className="font-black text-primary">{exerciseName}</span>
          </DialogTitle>
          <DialogDescription>
            Adicione uma foto sua, link do YouTube ou use a demonstração padrão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview grande */}
          <div className="flex justify-center">
            <ExerciseThumb
              name={exerciseName}
              group={group}
              size="lg"
              showPlay={!!media.youtubeId}
              className="h-48 w-48 rounded-2xl shadow-md border border-border/40"
            />
          </div>

          {/* Abas de controle */}
          <Tabs defaultValue="photo" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="photo" className="rounded-lg gap-1.5">
                <Upload className="h-4 w-4" /> Foto
              </TabsTrigger>
              <TabsTrigger value="youtube" className="rounded-lg gap-1.5">
                <Youtube className="h-4 w-4" /> YouTube
              </TabsTrigger>
              <TabsTrigger value="manage" className="rounded-lg gap-1.5">
                <ImageIcon className="h-4 w-4" /> Gerenciar
              </TabsTrigger>
            </TabsList>

            {/* TAB: UPLOAD DE FOTO */}
            <TabsContent value="photo" className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-primary/60 hover:bg-primary/5"
              >
                <Upload className="h-8 w-8 text-primary/60 mx-auto mb-2" />
                <p className="font-semibold text-foreground">Clique para fazer upload</p>
                <p className="text-xs text-muted-foreground mt-1">ou arraste uma imagem aqui</p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">JPG, PNG, WebP • máx 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
              />

              {media.image && (
                <div className="space-y-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <Check className="h-4 w-4" /> Foto adicionada!
                  </div>
                  <p className="text-xs text-muted-foreground">Sua foto está salva e será usada como capa do exercício.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remover foto
                  </Button>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Dica
                </p>
                <p>Tire uma foto boa do exercício sendo realizado (de lado, mostrando a forma).</p>
                <p>A foto terá prioridade sobre vídeos e outros recursos.</p>
              </div>
            </TabsContent>

            {/* TAB: YOUTUBE */}
            <TabsContent value="youtube" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Link ou ID do YouTube</label>
                <Input
                  placeholder="https://youtube.com/watch?v=... ou ID (11 caracteres)"
                  value={ytInput}
                  onChange={(e) => {
                    setYtInput(e.target.value);
                    setYtError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleYouTubeAdd();
                  }}
                  disabled={ytLoading}
                  className="h-10 rounded-lg"
                />
              </div>

              {ytError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {ytError}
                </div>
              )}

              <Button
                onClick={handleYouTubeAdd}
                disabled={!ytInput.trim() || ytLoading}
                className="w-full h-10 rounded-lg font-semibold"
              >
                {ytLoading ? (
                  <>Validando...</>
                ) : (
                  <>
                    <Youtube className="h-4 w-4 mr-2" /> Adicionar vídeo
                  </>
                )}
              </Button>

              {media.youtubeId && (
                <div className="space-y-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <Check className="h-4 w-4" /> Vídeo adicionado!
                  </div>
                  <p className="text-xs text-muted-foreground">ID: <code className="bg-background/60 px-1.5 py-0.5 rounded text-[10px] font-mono">{media.youtubeId}</code></p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex-1"
                      onClick={() => window.open(`https://youtube.com/watch?v=${media.youtubeId}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Abrir vídeo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={handleRemoveVideo}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Dica
                </p>
                <p>Procure por "como fazer [exercício]" no YouTube e cole o link aqui.</p>
                <p>A thumbnail do vídeo será usada como capa se você não tiver uma foto.</p>
              </div>
            </TabsContent>

            {/* TAB: GERENCIAR */}
            <TabsContent value="manage" className="space-y-3">
              <div className="grid gap-3">
                <div className="p-3 rounded-lg border border-border/40 bg-card/50">
                  <h4 className="font-semibold text-sm mb-2">Foto personalizada</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {media.image ? "✅ Ativa" : "❌ Não configurada"}
                  </p>
                  {media.image && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs w-full"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover foto
                    </Button>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-border/40 bg-card/50">
                  <h4 className="font-semibold text-sm mb-2">Vídeo YouTube</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {media.youtubeId ? (
                      <code className="bg-background/60 px-1.5 py-0.5 rounded text-[10px] font-mono">{media.youtubeId}</code>
                    ) : (
                      "❌ Não configurado"
                    )}
                  </p>
                  {media.youtubeId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs w-full"
                      onClick={handleRemoveVideo}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover vídeo
                    </Button>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-border/40 bg-card/50">
                  <h4 className="font-semibold text-sm mb-2">Padrão do sistema</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Usa cores do grupo muscular + inicial do exercício
                  </p>
                  <div
                    className="h-16 rounded-lg flex items-center justify-center text-white font-black text-3xl"
                    style={{ background: `linear-gradient(140deg, ${color} 0%, ${color}80 100%)` }}
                  >
                    {exerciseName[0]?.toUpperCase()}
                  </div>
                </div>
              </div>

              {(media.image || media.youtubeId) && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full h-9 rounded-lg"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Limpar tudo
                </Button>
              )}

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Prioridade de exibição
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                  <li>Sua foto (se configurada)</li>
                  <li>Vídeo do YouTube (se configurado)</li>
                  <li>Demonstração animada automática</li>
                  <li>Padrão colorido (fallback)</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            <Check className="h-4 w-4 mr-1" /> Pronto!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
