import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileDock } from "@/components/layout/mobile-dock";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import { ThemeScript } from "@/components/theme/theme-script";
import { SwRegister } from "@/components/pwa/sw-register";
import { SITE, absoluteUrl, orgId, websiteId } from "@/lib/seo";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

// theme-color is managed at runtime (ThemeScript + ThemeToggle) because the
// theme is toggled via html.dark, not prefers-color-scheme media queries.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: absoluteUrl() }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "dating",
  keywords: [...SITE.keywords],
  generator: undefined,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // icon/shortcut come from the file conventions (src/app/icon.svg + favicon.ico)
  icons: {
    apple: [{ url: "/logo.jpeg", type: "image/jpeg" }],
  },
  manifest: "/manifest.webmanifest",
  // No `alternates.canonical` here. Metadata is shallow-merged and inherited,
  // so a canonical on the root layout became "this page IS the homepage" for
  // every page that did not override it — /termos, /privacidade, /regras,
  // /reembolso and /assinatura all told Google to drop them in favour of "/",
  // while sitemap.ts submitted those same URLs for indexing. Contradictory
  // signals, and unindexable Terms/Refund pages are a bad look for a product
  // that takes payments. Each page now declares its own.
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/"),
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    // images come from the file convention (src/app/opengraph-image.tsx)
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "geo.region": "BR",
    "content-language": "pt-BR",
  },
};

const globalJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: SITE.name,
    legalName: SITE.legalName,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.jpeg"),
      width: 512,
      height: 512,
    },
    image: absoluteUrl("/logo.jpeg"),
    description: SITE.description,
    slogan: SITE.tagline,
    areaServed: {
      "@type": "Country",
      name: "Brasil",
    },
    knowsAbout: [
      "speed dating",
      "encontros presenciais",
      "eventos para solteiros",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(),
    name: SITE.name,
    url: absoluteUrl("/"),
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { "@id": orgId() },
  },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const showDock = !!session?.user;

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} h-full`}
      // globals.css sets `scroll-behavior: smooth` for in-page anchors. Next 16
      // no longer suppresses that during route transitions on its own, so every
      // navigation animated a scroll to the top instead of jumping — very
      // visible leaving the long homepage. This opts back into the old
      // override: smooth for anchors, instant for navigation.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body
        className={`page-glow flex min-h-full flex-col bg-[var(--paper)] text-[var(--ink)] antialiased ${
          showDock ? "has-mobile-dock" : ""
        }`}
        suppressHydrationWarning
      >
        <JsonLd data={globalJsonLd} />
        <SwRegister />
        <Header />
        <div className="flex flex-1 flex-col animate-rise">{children}</div>
        <Footer />
        {showDock ? <MobileDock /> : null}
      </body>
    </html>
  );
}
