import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala, Noto_Sans_Tamil, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./dark-theme.css";
import { LanguageProvider } from "../src/lib/i18n";
import SiteFrame from "../src/components/SiteFrame";
import AppShell from "../src/components/AppShell";

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
  applicationName: "Lanka Women E-Market",
  appleWebApp: { capable: true, title: "Women E-Market", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

// Phone browser colour, full-screen (notch) support and installable-app details
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#a3205f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSinhala.variable} ${notoTamil.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        {/* Light or dark: applied before the first paint so the page never flashes the wrong colours */}
        <script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement,l=localStorage;if(l.getItem('lw-theme')==='dark')d.setAttribute('data-theme','dark');var a=l.getItem('lw-accent'),p=l.getItem('lw-pattern');if(/^(ocean|forest|royal|slate)$/.test(a))d.setAttribute('data-accent',a);if(/^(dots|lattice|waves)$/.test(p))d.setAttribute('data-pattern',p)}catch(e){}" }} />
      </head>
      {/* Browser extensions (e.g. converters, translators) add attributes to <body>; don't treat that as a hydration error */}
      <body className="bg-mesh flex min-h-full flex-col text-ink" suppressHydrationWarning>
        <LanguageProvider>
          <SiteFrame>{children}</SiteFrame>
          <AppShell />
        </LanguageProvider>
      </body>
    </html>
  );
}
