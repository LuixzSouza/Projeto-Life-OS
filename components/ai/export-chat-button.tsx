"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportChatMarkdown } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";

/** Baixa a conversa atual como arquivo .md (sempre fresca, direto do banco). */
export function ExportChatButton({ chatId }: { chatId: string }) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await exportChatMarkdown(chatId);
            if (!res.success || !res.markdown) {
                toast.error(("error" in res && res.error) || "Não foi possível exportar.");
                return;
            }
            const slug = (res.title || "conversa")
                .toLowerCase()
                .normalize("NFD").replace(/[̀-ͯ]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") || "conversa";
            const blob = new Blob([res.markdown], { type: "text/markdown;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}.md`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Conversa exportada em Markdown.");
        } catch {
            toast.error("Falha ao exportar a conversa.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            title="Exportar conversa (.md)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary disabled:opacity-60"
        >
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        </button>
    );
}
