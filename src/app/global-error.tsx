"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown in the ROOT layout itself — the one
 * place src/app/error.tsx cannot catch, because error.tsx renders inside the
 * layout. Without this, such an error falls through to Next's unstyled default
 * screen. global-error replaces the whole document, so it ships its own <html>
 * / <body> and cannot rely on the app's CSS being present; styles are inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // onRequestError covers the server; this reports the client-side throw.
    // Kept as console.error on purpose — the app's logger may be part of what
    // failed to load, and this file must stand entirely on its own.
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6f1",
          color: "#1a100c",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#6b574c",
              fontFamily: "Arial, Helvetica, sans-serif",
              marginBottom: "12px",
            }}
          >
            Coffee Match
          </div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 12px" }}>
            Algo deu muito errado
          </h1>
          <p
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#3d2e26",
            }}
          >
            Não conseguimos carregar o aplicativo. Tente de novo em instantes.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#6b574c",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              display: "inline-block",
              background: "linear-gradient(165deg,#c9843f,#b87333)",
              color: "#fffaf5",
              border: "none",
              fontWeight: 600,
              padding: "13px 28px",
              borderRadius: "999px",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
