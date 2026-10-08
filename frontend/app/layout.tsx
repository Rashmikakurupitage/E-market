import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala, Noto_Sans_Tamil, Playfair_Display } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../src/lib/i18n";
import SiteHeader from "../src/components/SiteHeader";
import SiteFooter from "../src/components/SiteFooter";
import ScrollExtras from "../src/components/ScrollExtras";
import CartDrawer from "../src/components/CartDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings (English); Sinhala and Tamil headings fall back to the Noto fonts
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
});

export const metadata: Metadata = {
  title: "Lanka Women E-Market | ලංකා කාන්තා ඊ-වෙළඳපොළ",
  description:
    "Shop authentic handicrafts, agri-products and textiles directly from women entrepreneurs across Sri Lanka.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSinhala.variable} ${notoTamil.variable} ${playfair.variable} h-full antialiased`}
    >
      {/* Browser extensions (e.g. converters, translators) add attributes to <body>; don't treat that as a hydration error */}
      <body className="bg-mesh flex min-h-full flex-col text-ink" suppressHydrationWarning>
        <LanguageProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <ScrollExtras />
          <CartDrawer />
        </LanguageProvider>
      </body>
    </html>
  );
}
