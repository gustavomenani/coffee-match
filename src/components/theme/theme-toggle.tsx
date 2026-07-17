"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "coffee-match-theme";

/** Browser-chrome colors — must match ThemeScript and --paper in globals.css */
const THEME_COLORS: Record<Theme, string> = {
  light: "#faf6f1",
  dark: "#120c09",
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  // Keep the mobile browser bar in sync (meta is created by ThemeScript on boot)
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLORS[theme]);
}

let flipTimer: number | undefined;
let cleanupTimer: number | undefined;

/**
 * GPU-only fade-through: dim the page (compositor opacity — cannot jank),
 * flip the theme class while dimmed, fade back in. Per-element color
 * transitions repaint hundreds of nodes per frame and stutter; this doesn't.
 */
function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;

  if (!animate || prefersReducedMotion()) {
    setThemeClass(theme);
    return;
  }

  window.clearTimeout(flipTimer);
  window.clearTimeout(cleanupTimer);

  // Canvas behind the fading page shows the TARGET theme color,
  // so the dip already leans toward where we're going.
  root.style.backgroundColor = THEME_COLORS[theme];
  root.style.transition = "opacity 150ms ease-out";
  root.style.opacity = "0.35";

  flipTimer = window.setTimeout(() => {
    setThemeClass(theme); // instant, hidden by the dim
    root.style.transition = "opacity 260ms ease-in";
    root.style.opacity = "1";

    cleanupTimer = window.setTimeout(() => {
      root.style.removeProperty("transition");
      root.style.removeProperty("opacity");
      root.style.removeProperty("background-color");
    }, 300);
  }, 160);
}

const emptySubscribe = () => () => {};

/** Mirrors the logic in ThemeScript — safe to read during client render */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  // false during SSR/hydration, true after — without setState-in-effect
  const ready = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Script already set the class early; re-sync DOM + meta (idempotent)
    setThemeClass(theme);
  }, [theme]);

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
            className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              theme === "dark"
                ? "scale-100 rotate-0 opacity-100"
                : "scale-50 -rotate-90 opacity-0"
            }`}
            aria-hidden
          >
            {/* sun — visible in dark (click → light) */}
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
            className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              theme === "light"
                ? "scale-100 rotate-0 opacity-100"
                : "scale-50 rotate-90 opacity-0"
            }`}
            aria-hidden
          >
            {/* moon — visible in light (click → dark) */}
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
