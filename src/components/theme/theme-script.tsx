/**
 * Inline script — runs before paint to avoid flash of wrong theme.
 * Must stay free of external imports (injected as raw script in layout).
 */
export function ThemeScript() {
  const code = `(function(){try{var k='coffee-match-theme';var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;if(t==='dark')r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=t;}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      // Prevent React from re-running on hydration
      suppressHydrationWarning
    />
  );
}
