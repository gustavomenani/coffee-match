"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "coffee-match-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = theme;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    let initial: Theme = "light";
    if (stored === "dark" || stored === "light") {
      initial = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initial = "dark";
    }
    setTheme(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-card)] text-[var(--ink-soft)] shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--champagne)_50%,var(--line-strong))] hover:text-[var(--coffee)] ${className}`}
      aria-label={
        theme === "dark" ? "Ativar modo dia" : "Ativar modo noite"
      }
      title={theme === "dark" ? "Modo dia" : "Modo noite"}
      suppressHydrationWarning
    >
      {!ready ? (
        <span className="h-4 w-4 rounded-full bg-[var(--muted)] opacity-40" />
      ) : theme === "dark" ? (
        /* sun */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* moon */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
