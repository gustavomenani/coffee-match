"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (/sw.js) apenas em produção.
 * Em desenvolvimento não registra para não interferir no hot reload.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha de registro não deve quebrar a página.
    });
  }, []);

  return null;
}
