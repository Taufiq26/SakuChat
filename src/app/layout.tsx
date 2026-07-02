import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sakuchat.smartpixel.id"),
  title: "SakuChat | Asisten Keuangan Pribadi Berbasis Chat",
  description: "Aplikasi PWA pencatatan pengeluaran pribadi semudah obrolan (chat) dengan analisis persentase kategori, detektor lonjakan, dan offline-first.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "SakuChat | Asisten Keuangan Pribadi Berbasis Chat",
    description: "Catat pengeluaran semudah obrolan chat! Dilengkapi On-Device WebAI, 100% Privat, Offline-First, dan Gratis Selamanya.",
    url: "https://sakuchat.smartpixel.id",
    siteName: "SakuChat",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "SakuChat Logo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SakuChat | Asisten Keuangan Pribadi Berbasis Chat",
    description: "Catat pengeluaran semudah obrolan chat! Dilengkapi On-Device WebAI, 100% Privat, Offline-First, dan Gratis Selamanya.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SakuChat",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('sakuchat_theme_v1');
                  var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.addEventListener('DOMContentLoaded', function() { document.body.classList.add('dark'); });
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
