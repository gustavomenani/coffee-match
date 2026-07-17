"use client";

import { useEffect, useState, useTransition } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "coffee-match-theme";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;

  if (!animate || prefersReducedMotion()) {
    setThemeClass(theme);
    return;
  }

  // Smooth cross-fade when browser supports View Transitions
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      setThemeClass(theme);
    });
    return;
  }

  // Fallback: timed CSS transitions on key surfaces
  root.classList.add("theme-switching");
  // Force style flush so transitions run from current computed values
  void root.offsetHeight;
  setThemeClass(theme);
  window.setTimeout(() => {
    root.classList.remove("theme-switching");
  }, 480);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    let initial: Theme = "light";
    if (stored === "dark" || stored === "light") {
      initial = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initial = "dark";
    }
    setTheme(initial);
    // Initial apply without animation (script already set class; keep in sync)
    setThemeClass(initial);
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    startTransition(() => {
      setTheme(next);
    });
    applyTheme(next, true);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle-btn relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--paper-card)] text-[var(--ink-soft)] shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:border-[color-mix(in_srgb,var(--champagne)_50%,var(--line-strong))] hover:text-[var(--coffee)] active:scale-95 ${className}`}
      aria-label={
        theme === "dark" ? "Ativar modo dia" : "Ativar modo noite"
      }
      title={theme === "dark" ? "Modo dia" : "Modo noite"}
      suppressHydrationWarning
    >
      {!ready ? (
        <span className="h-4 w-4 rounded-full bg-[var(--muted)] opacity-40" />
      ) : (
        <>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.2,0,0,1)] ${
              theme === "dark"
                ? "scale-100 rotate-0 opacity-100"
                : "scale-50 -rotate-90 opacity-0"
            }`}
            aria-hidden
          >
            {/* sun — shown in dark mode (click to go light) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.2,0,0,1)] ${
              theme === "light"
                ? "scale-100 rotate-0 opacity-100"
                : "scale-50 rotate-90 opacity-0"
            }`}
            aria-hidden
          >
            {/* moon — shown in light mode (click to go dark) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </>
      )}
    </button>
  );
}
