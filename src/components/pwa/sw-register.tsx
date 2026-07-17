"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (/sw.js).
 *
 * Em produção registra sempre. Em desenvolvimento normalmente NÃO registra
 * (para não interferir no hot reload), exceto quando a flag de depuração
 * `localStorage["cm-push-debug"] === "1"` está ligada — necessária para
 * testar Web Push localmente, já que push exige um SW ativo.
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let pushDebug = false;
    try {
      pushDebug = localStorage.getItem("cm-push-debug") === "1";
    } catch {
      // localStorage indisponível (ex.: bloqueio de armazenamento).
    }

    if (process.env.NODE_ENV !== "production" && !pushDebug) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha de registro não deve quebrar a página.
    });
  }, []);

  return null;
}
