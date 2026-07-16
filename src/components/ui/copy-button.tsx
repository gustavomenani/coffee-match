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
      className={`btn btn-secondary !min-h-10 !px-4 !text-sm ${className}`}
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}
