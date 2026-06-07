"use client";

import { useState } from "react";
import { X, Youtube, ExternalLink, Save, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseYouTubeId, youtubeEmbed, youtubeSearchUrl } from "./exercise-media";
import { ExerciseThumb } from "./exercise-thumb";

/**
 * Demonstração do exercício em tela cheia. Mostra o vídeo do YouTube salvo, ou
 * deixa o usuário buscar e colar um link (que fica salvo p/ as próximas sessões).
 */
export function ExerciseDemoModal({
  name,
  youtubeId,
  onClose,
  onSave,
}: {
  name: string;
  youtubeId?: string;
  onClose: () => void;
  onSave: (id: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState(!youtubeId);

  const save = () => {
    const id = parseYouTubeId(url);
    if (!id) {
      toast.error("Link do YouTube inválido. Cole a URL do vídeo.");
      return;
    }
    onSave(id);
    setUrl("");
    setEditing(false);
    toast.success("Vídeo salvo para este exercício.");
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Topo */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <Youtube className="h-5 w-5 text-red-500" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-8">
        {youtubeId && !editing ? (
          <>
            <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <iframe
                src={youtubeEmbed(youtubeId)}
                title={`Demonstração: ${name}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setEditing(true)}>
                <Youtube className="h-4 w-4" /> Trocar vídeo
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => { onSave(null); toast.success("Vídeo removido."); onClose(); }}>
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md space-y-4 text-center">
            {/* Demonstração animada (free-exercise-db) enquanto não há vídeo salvo */}
            <ExerciseThumb name={name} showPlay={false} size="lg" className="mx-auto aspect-video w-full max-w-sm rounded-2xl" />

            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Quer um vídeo?</p>
              <p className="text-sm text-white/60">Busque no YouTube e cole o link aqui. Fica salvo para as próximas vezes.</p>
            </div>

            <a
              href={youtubeSearchUrl(name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <Search className="h-4 w-4" /> Buscar &quot;{name}&quot; no YouTube <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>

            <div className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                placeholder="Cole o link do YouTube…"
                className="h-11 border-white/20 bg-white/5 text-white placeholder:text-white/40"
              />
              <Button onClick={save} disabled={!url.trim()} className="h-11 shrink-0 gap-1.5">
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>

            {youtubeId && (
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
                Cancelar e voltar ao vídeo atual
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
