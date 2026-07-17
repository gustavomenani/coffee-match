"use client";

import { useEffect, useState } from "react";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/actions/push";

/** Converte a VAPID public key (base64url) para o formato do PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type Status =
  | "loading" // checando suporte/inscrição no mount
  | "hidden" // sem suporte no navegador ou feature desligada no servidor
  | "denied" // permissão de notificação bloqueada
  | "subscribed"
  | "unsubscribed";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("hidden");
        return;
      }

      const key = await getVapidPublicKey().catch(() => null);
      if (cancelled) return;
      if (!key) {
        // Feature desligada no servidor (sem chaves VAPID).
        setStatus("hidden");
        return;
      }
      setPublicKey(key);

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = registration
          ? await registration.pushManager.getSubscription()
          : null;
        if (cancelled) return;
        setStatus(subscription ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setStatus("unsubscribed");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!publicKey) return;
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") {
        setError("Permissão de notificação não concedida.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Inscrição sem chaves.");
      }

      const result = await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (!result.ok) {
        await subscription.unsubscribe().catch(() => {});
        setError(result.error);
        return;
      }

      setStatus("subscribed");
    } catch {
      setError("Não foi possível ativar as notificações. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => {});
        await removePushSubscription(endpoint);
      }

      setStatus("unsubscribed");
    } catch {
      setError("Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "hidden") {
    return null;
  }

  return (
    <section className="surface-card mt-8 p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
        Notificações no celular
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Receba avisos quando seus matches saírem e quando abrir vaga em um
        evento.
      </p>

      {status === "denied" ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Notificações bloqueadas no navegador.
        </p>
      ) : status === "subscribed" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-[var(--ink)]">
            Notificações ativas
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={disable}
            disabled={busy}
          >
            {busy ? "Desativando…" : "Desativar"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={enable}
            disabled={busy}
          >
            {busy ? "Ativando…" : "Ativar notificações"}
          </button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 text-sm font-medium text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
