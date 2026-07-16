import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileDock } from "@/components/layout/mobile-dock";
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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Coffee Match — Conectando pessoas, uma xícara por vez",
    template: "%s | Coffee Match",
  },
  description:
    "Coffee Match: noites presenciais de speed dating no Brasil. Rodadas reais, votação no celular e matches mútuos. 18+.",
  icons: {
    icon: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Coffee Match",
    title: "Coffee Match",
    description:
      "Conectando pessoas, uma xícara por vez. Speed dating presencial com matches mútuos.",
    images: [{ url: "/logo.jpeg", width: 512, height: 512, alt: "Coffee Match" }],
  },
  twitter: {
    card: "summary",
    title: "Coffee Match",
    description: "Conectando pessoas, uma xícara por vez.",
    images: ["/logo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full`}>
      <body className="page-glow has-mobile-dock flex min-h-full flex-col bg-[var(--paper)] text-[var(--ink)] antialiased">
        <Header />
        <div className="flex flex-1 flex-col animate-rise">{children}</div>
        <Footer />
        <MobileDock />
      </body>
    </html>
  );
}
