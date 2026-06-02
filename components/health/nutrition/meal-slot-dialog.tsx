"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChefHat, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEAL_TYPES } from "./weekly-planner-constants";
import type { MealSlotDialogProps } from "./weekly-planner-types";
import { MealSlotForm } from "./meal-slot-form";

// --- DIALOG WRAPPER ---
export function MealSlotDialog(props: MealSlotDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = MEAL_TYPES.find(t => t.id === props.type)?.icon || ChefHat;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={props.existingSlot ? "outline" : "default"}
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 transition-all duration-200",
            props.existingSlot
              ? "border-primary/20 text-primary hover:border-primary/40 hover:bg-primary/10"
              : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          )}
          aria-label={props.existingSlot ? `Editar ${props.label}` : `Planejar ${props.label}`}
        >
          {props.existingSlot ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </DialogTrigger>

      <DialogContent size="lg" className="bg-card p-0 gap-0">
        <DialogHeader
          icon={<Icon />}
          title={`Planejar ${props.label}`}
          description="Monte a refeição com os alimentos e as quantidades certas."
        />

        {isOpen && (
          <MealSlotForm
            {...props}
            onClose={() => setIsOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
