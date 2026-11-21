import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/i18n";
import { CartProvider } from "@/components/cart/CartProvider";
import { absoluteUrl } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: { default: "ECOM MARKET — Toute l'Afrique de l'Ouest, un seul marché", template: "%s · ECOM MARKET" },
  description: "Achetez et vendez près de chez vous. Des milliers de produits et de boutiques au Burkina Faso et en Afrique de l'Ouest. Zéro commission pour les vendeurs.",
  applicationName: "ECOM MARKET",
  manifest: "/manifest.webmanifest",
  openGraph: { siteName: "ECOM MARKET", type: "website", locale: "fr_FR" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F25412" }, { media: "(prefers-color-scheme: dark)", color: "#0A0B1E" }],
  width: "device-width",
  initialScale: 1,
};

// Évite le flash de thème : applique la classe avant le rendu.
const themeScript = `try{var t=localStorage.getItem('em_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
