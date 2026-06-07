// components/projects/view-toggle.tsx
"use client";

import { Button } from "@/components/ui/button";
import { List, AlignJustify, Grid3x3 } from "lucide-react";
import Link from "next/link";

type ViewType = "list" | "compact" | "grid";

interface ViewToggleProps {
  currentView: ViewType;
  buildUrl: (params: { view: ViewType }) => string;
}

export function ViewToggle({ currentView, buildUrl }: ViewToggleProps) {
  const views = [
    { value: "list" as const, icon: <List className="h-4 w-4" />, label: "Lista" },
    { value: "compact" as const, icon: <AlignJustify className="h-4 w-4" />, label: "Compacto" },
    { value: "grid" as const, icon: <Grid3x3 className="h-4 w-4" />, label: "Grade" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Visualização</h3>
      <div className="flex gap-2">
        {views.map(({ value, icon, label }) => (
          <Link key={value} href={buildUrl({ view: value })}>
            <Button 
              size="icon" 
              variant={currentView === value ? "default" : "outline"}
              className="h-10 w-10"
              title={label}
            >
              {icon}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}