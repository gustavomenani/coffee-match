import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileDock } from "@/components/layout/mobile-dock";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import { SITE, absoluteUrl, orgId, websiteId } from "@/lib/seo";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a100c" },
  ],
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
  icons: {
    icon: [{ url: "/logo.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpeg", type: "image/jpeg" }],
    shortcut: "/logo.jpeg",
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      "pt-BR": absoluteUrl("/"),
    },
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/"),
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [
      {
        url: absoluteUrl("/logo.jpeg"),
        width: 1200,
        height: 1200,
        alt: `${SITE.name} logo`,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [absoluteUrl("/logo.jpeg")],
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
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full`}>
      <body
        className={`page-glow flex min-h-full flex-col bg-[var(--paper)] text-[var(--ink)] antialiased ${
          showDock ? "has-mobile-dock" : ""
        }`}
      >
        <JsonLd data={globalJsonLd} />
        <Header />
        <div className="flex flex-1 flex-col animate-rise">{children}</div>
        <Footer />
        {showDock ? <MobileDock /> : null}
      </body>
    </html>
  );
}
