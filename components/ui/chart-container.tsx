"use client";

import { useEffect, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";
import type { ComponentProps, ReactElement } from "react";

type ResponsiveProps = ComponentProps<typeof ResponsiveContainer>;

interface ChartContainerProps extends Omit<ResponsiveProps, "width" | "height" | "children"> {
  children: ReactElement;
  className?: string;
}

/**
 * Wrapper do Recharts `ResponsiveContainer` que só monta o gráfico depois de
 * medir um tamanho > 0 (via ResizeObserver).
 *
 * Evita o warning "The width(-1) and height(-1) of chart should be greater
 * than 0" que aparece quando o container está oculto (tab/toggle por CSS),
 * durante o double-render do React Strict Mode (dev), ou antes de o layout
 * resolver. Drop-in: troca `<ResponsiveContainer width="100%" height="100%">`
 * por `<ChartContainer>` dentro de um pai com altura definida.
 */
export function ChartContainer({ children, className, ...rest }: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setReady(box.width > 0 && box.height > 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%" }}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" {...rest}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
