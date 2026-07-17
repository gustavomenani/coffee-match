"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type MouseEvent,
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

/** Radius from click point that covers the full viewport */
function coverRadius(x: number, y: number) {
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  return Math.hypot(maxX, maxY);
}

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

function applyTheme(
  theme: Theme,
  animate: boolean,
  origin?: { x: number; y: number },
) {
  const root = document.documentElement;

  if (!animate || prefersReducedMotion()) {
    setThemeClass(theme);
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => ViewTransition;
  };

  if (typeof doc.startViewTransition === "function") {
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 48;
    const radius = coverRadius(x, y);

    root.dataset.themeTransition = theme === "dark" ? "to-dark" : "to-light";

    const transition = doc.startViewTransition(() => {
      setThemeClass(theme);
    });

    transition.ready
      .then(() => {
        // Circular reveal of the new theme from the toggle
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 520,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );

        // Old theme gently recedes (keeps continuity, less harsh flash)
        root.animate(
          {
            opacity: [1, 0.92],
          },
          {
            duration: 420,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            pseudoElement: "::view-transition-old(root)",
          },
        );
      })
      .catch(() => {
        /* transition aborted */
      })
      .finally(() => {
        delete root.dataset.themeTransition;
      });

    return;
  }

  // Fallback: timed CSS transitions on key surfaces
  root.classList.add("theme-switching");
  void root.offsetHeight;
  setThemeClass(theme);
  window.setTimeout(() => {
    root.classList.remove("theme-switching");
  }, 480);
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
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Script already set the class early; re-sync DOM + meta (idempotent)
    setThemeClass(theme);
  }, [theme]);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const rect = btnRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: e.clientX, y: e.clientY };

    startTransition(() => {
      setTheme(next);
    });
    applyTheme(next, true, origin);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      ref={btnRef}
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
