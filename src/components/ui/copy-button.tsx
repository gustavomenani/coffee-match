"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={`btn btn-secondary btn-sm ${className}`}
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}
