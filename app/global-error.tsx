"use client";

import { useEffect } from "react";

/**
 * global-error substitui TODO o layout raiz (inclusive <html>/<body>)
 * quando o próprio RootLayout falha. Por isso usamos estilos inline:
 * o CSS global pode não ter sido carregado neste cenário catastrófico.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🔥 [GLOBAL ERROR]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0a0a0b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "18px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            fontSize: "34px",
          }}
        >
          ⚠️
        </div>

        <div style={{ maxWidth: "28rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Falha crítica no sistema
          </h1>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(250,250,250,0.65)", margin: 0 }}>
            O Life OS encontrou um erro grave ao iniciar. Tente recarregar a
            aplicação. Seus dados locais permanecem intactos.
          </p>
          {error?.digest && (
            <code
              style={{
                margin: "0.25rem auto 0",
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "rgba(250,250,250,0.6)",
              }}
            >
              ID: {error.digest}
            </code>
          )}
        </div>

        <button
          onClick={reset}
          style={{
            cursor: "pointer",
            padding: "0.625rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            background: "#fafafa",
            color: "#0a0a0b",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          Recarregar aplicação
        </button>
      </body>
    </html>
  );
}
