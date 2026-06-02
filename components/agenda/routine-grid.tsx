"use client";

import { useMemo } from "react";
import { RoutineItem } from "@prisma/client";
import { Sun, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CategoryKey } from "./routine-config";
import { EditRoutineDialog } from "./edit-routine-dialog";

// --- ROUTINE GRID (TIMEBLOCKING) ---
const START_HOUR = 5; // 05:00
const END_HOUR = 23;  // 23:00
const HOUR_HEIGHT = 80;

export function RoutineGrid({ items }: { items: RoutineItem[] }) {
  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) h.push(i);
    return h;
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground/40 text-center">
        <Sun className="h-16 w-16 mb-4 opacity-50" />
        <h4 className="text-xl font-black uppercase tracking-tighter text-foreground/50">Dia Livre</h4>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Nenhum protocolo para hoje</p>
      </div>
    );
  }

  const getStyle = (start: string, end: string) => {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startMins = (sH - START_HOUR) * 60 + sM;
    const durationMins = (eH * 60 + eM) - (sH * 60 + sM);

    return {
      top: `${(startMins / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((durationMins / 60) * HOUR_HEIGHT, 40)}px`
    };
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar p-4">
      <div className="relative w-full" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>

        {/* Background Régua */}
        {hours.map((hour) => (
          <div key={hour} className="absolute w-full flex items-start" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
            <div className="w-14 text-right pr-3 shrink-0 -mt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{hour.toString().padStart(2, '0')}:00</span>
            </div>
            <div className="flex-1 border-t border-border/40 border-dashed" />
          </div>
        ))}

        {/* Blocos de Rotina */}
        <div className="absolute left-14 right-2 top-0 bottom-0">
          {items.map((item) => {
            const styleProps = getStyle(item.startTime, item.endTime);
            const catKey = item.category && CATEGORIES[item.category as CategoryKey] ? (item.category as CategoryKey) : "study";
            const theme = CATEGORIES[catKey];
            const Icon = theme.icon;
            const isCompact = parseFloat(styleProps.height) <= 50;

            return (
              <EditRoutineDialog key={item.id} item={item}>
                <div
                  className={cn(
                    "absolute left-2 right-2 rounded-xl border p-2.5 shadow-sm transition-all hover:shadow-lg hover:z-10 group cursor-pointer overflow-hidden",
                    theme.bgClass, theme.borderClass
                  )}
                  style={styleProps}
                >
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2", theme.bgClass.replace("/10", "/50"))} />

                  <div className="flex justify-between items-start h-full pl-2">
                    <div className="flex flex-col min-w-0 h-full">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3 w-3 shrink-0", theme.colorClass)} />
                        <h4 className="font-bold text-xs truncate text-foreground leading-tight">{item.title}</h4>
                      </div>

                      {!isCompact && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider", theme.colorClass)}>{theme.label}</span>
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums border-l border-border pl-2">
                            {item.startTime} - {item.endTime}
                          </span>
                        </div>
                      )}

                      {!isCompact && item.description && (
                        <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1.5 font-medium">{item.description}</p>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 rounded-md p-1 backdrop-blur-sm">
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </EditRoutineDialog>
            );
          })}
        </div>
      </div>
    </div>
  );
}
