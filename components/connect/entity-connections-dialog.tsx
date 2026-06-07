"use client";

import { Tag as TagIcon, Paperclip, GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EntityTags } from "./entity-tags";
import { EntityAttachments } from "./entity-attachments";
import { EntityLinks } from "./entity-links";

/**
 * Diálogo único "Tags & Anexos" para qualquer entidade. Soltar num módulo:
 *
 *   const [conn, setConn] = useState<{ id: string; title: string } | null>(null)
 *   // no menu do item: onClick={() => setConn({ id: item.id, title: item.title })}
 *   <EntityConnectionsDialog
 *     entityType="event"
 *     item={conn}
 *     onOpenChange={(o) => !o && setConn(null)}
 *   />
 */
export function EntityConnectionsDialog({
  entityType,
  item,
  onOpenChange,
}: {
  entityType: string;
  item: { id: string; title: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          {/* pr-10 reserva espaço para o X de fechar (right-4, 32px) — evita o título por baixo. */}
          <DialogTitle className="line-clamp-1 pr-10">{item?.title ?? "Conexões"}</DialogTitle>
        </DialogHeader>
        {item && (
          <Tabs defaultValue="tags" className="mt-1">
            <TabsList className="w-full">
              <TabsTrigger value="tags" className="flex-1 gap-1.5">
                <TagIcon className="h-4 w-4" /> Tags
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-1 gap-1.5">
                <Paperclip className="h-4 w-4" /> Anexos
              </TabsTrigger>
              <TabsTrigger value="links" className="flex-1 gap-1.5">
                <GitBranch className="h-4 w-4" /> Conexões
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tags" className="pt-2">
              <EntityTags entityType={entityType} entityId={item.id} />
            </TabsContent>
            <TabsContent value="files" className="pt-2">
              <EntityAttachments entityType={entityType} entityId={item.id} />
            </TabsContent>
            <TabsContent value="links" className="pt-2">
              <EntityLinks entityType={entityType} entityId={item.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
