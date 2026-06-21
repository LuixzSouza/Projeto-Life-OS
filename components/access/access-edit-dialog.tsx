"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Fingerprint } from "lucide-react";
import { AccessForm, type AccessData } from "./access-form";

interface AccessEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AccessData;
}

export function AccessEditDialog({ open, onOpenChange, item }: AccessEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>Sincronizar Acesso</DialogTitle>
              <DialogDescription>Atualize as credenciais no cofre</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <AccessForm item={item} onClose={() => onOpenChange(false)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
