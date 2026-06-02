"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shirt, Search, Camera, ImagePlus, X, Link as LinkIcon, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/image";
import { fetchProductPreview } from "@/app/(dashboard)/wardrobe/actions";
import { CATEGORY_OPTIONS } from "./wardrobe-form-constants";

interface WardrobeImagePickerProps {
    previewImage: string;
    color: string;
    category: string;
    onPreviewChange: (url: string) => void;
    onApplyProduct: (data: { img: string; name?: string | null; brand?: string | null }) => void;
}

type Source = "foto" | "loja" | "url";

export function WardrobeImagePicker({ previewImage, color, category, onPreviewChange, onApplyProduct }: WardrobeImagePickerProps) {
    const [source, setSource] = useState<Source>("foto");
    const [storeUrl, setStoreUrl] = useState("");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [uploading, setUploading] = useState(false);
    const [importing, setImporting] = useState(false);

    const galleryRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    const SelectedCategoryIcon = CATEGORY_OPTIONS.find(c => c.value === category)?.icon || Shirt;

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); input.value = ""; return; }
        if (file.size > 15 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 15MB)."); input.value = ""; return; }

        try {
            setUploading(true);
            const compressed = await compressImageFile(file, { maxDimension: 800, quality: 0.8 });
            onPreviewChange(compressed);
        } catch {
            toast.error("Não foi possível processar a imagem.");
        } finally {
            setUploading(false);
            input.value = "";
        }
    };

    const handleImportStore = async () => {
        const url = storeUrl.trim();
        if (!url) return;
        try {
            setImporting(true);
            const result = await fetchProductPreview(url);
            if (result.success) {
                onApplyProduct({ img: result.image, name: result.title, brand: result.brand });
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Falha ao importar do link.");
        } finally {
            setImporting(false);
        }
    };

    const handleApplyUrl = () => {
        const url = imageUrlInput.trim();
        if (!url) return;
        onPreviewChange(url);
        toast.success("Imagem aplicada!");
    };

    return (
        <div className="w-full md:w-2/5 bg-muted/20 border-b md:border-b-0 md:border-r border-border/40 flex flex-col shrink-0">

            {/* --- ÁREA DE PREVIEW --- */}
            <div className="relative flex-1 min-h-[200px] md:min-h-0 flex items-center justify-center overflow-hidden">
                {previewImage ? (
                    <div className="absolute inset-0 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt="Pré-visualização da peça" className="w-full h-full object-contain p-4 md:p-8" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <Button variant="destructive" className="rounded-xl shadow-2xl font-bold gap-2" onClick={() => onPreviewChange("")}>
                                <X className="h-4 w-4" /> Remover Foto
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => galleryRef.current?.click()}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity hover:opacity-95 group"
                        style={{ backgroundColor: color || "#f4f4f5" }}
                    >
                        <SelectedCategoryIcon className="h-28 w-28 md:h-40 md:w-40 text-white mix-blend-overlay drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute bottom-6 bg-background/30 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold shadow-lg flex items-center gap-2">
                            <ImagePlus className="h-3.5 w-3.5" /> Adicionar foto
                        </span>
                    </button>
                )}

                {(uploading || importing) && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">{importing ? "Buscando produto..." : "Processando imagem..."}</span>
                    </div>
                )}
            </div>

            {/* --- CONTROLES DE FONTE --- */}
            <div className="border-t border-border/40 bg-background p-3 md:p-4 space-y-3 shrink-0">
                {/* Segmented control */}
                <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl">
                    {([
                        { key: "foto", label: "Foto", icon: Camera },
                        { key: "loja", label: "Loja", icon: Store },
                        { key: "url", label: "Link", icon: LinkIcon },
                    ] as const).map(opt => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSource(opt.key)}
                            className={cn(
                                "flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-semibold transition-all",
                                source === opt.key ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                        </button>
                    ))}
                </div>

                {/* Painel ativo */}
                {source === "foto" && (
                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" className="h-11 rounded-xl gap-2 font-medium" onClick={() => cameraRef.current?.click()} disabled={uploading}>
                            <Camera className="h-4 w-4" /> Tirar Foto
                        </Button>
                        <Button type="button" variant="outline" className="h-11 rounded-xl gap-2 font-medium" onClick={() => galleryRef.current?.click()} disabled={uploading}>
                            <ImagePlus className="h-4 w-4" /> Galeria
                        </Button>
                        <p className="col-span-2 text-[10px] text-muted-foreground text-center">No celular, &quot;Tirar Foto&quot; abre a câmera direto.</p>
                    </div>
                )}

                {source === "loja" && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cole o link do produto (Zara, Amazon, Shein...)"
                                    value={storeUrl}
                                    onChange={(e) => setStoreUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImportStore(); } }}
                                    className="h-11 text-sm pl-9 bg-muted/30 rounded-xl"
                                />
                            </div>
                            <Button type="button" onClick={handleImportStore} disabled={importing || !storeUrl.trim()} className="h-11 px-4 rounded-xl gap-2">
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">Puxamos a foto, o nome e a marca automaticamente.</p>
                    </div>
                )}

                {source === "url" && (
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="https://.../foto.jpg"
                                value={imageUrlInput}
                                onChange={(e) => setImageUrlInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyUrl(); } }}
                                className="h-11 text-sm pl-9 bg-muted/30 rounded-xl"
                            />
                        </div>
                        <Button type="button" onClick={handleApplyUrl} disabled={!imageUrlInput.trim()} className="h-11 px-4 rounded-xl">Aplicar</Button>
                    </div>
                )}

                {/* Inputs ocultos: galeria e câmera (capture abre a câmera no mobile) */}
                <input type="file" ref={galleryRef} className="hidden" accept="image/*" onChange={handleFile} />
                <input type="file" ref={cameraRef} className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
            </div>
        </div>
    );
}
