import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TelegramBotInitializer from "@/components/TelegramBotInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Store Courier - Приложение для курьеров",
  description: "Профессиональное приложение для курьеров магазина с управлением заказами и уведомлениями",
  manifest: "/manifest.json",
  themeColor: "#4f39f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Store Courier",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Store Courier",
    title: "Store Courier - Приложение для курьеров",
    description: "Профессиональное приложение для курьеров магазина",
  },
  icons: {
    icon: "/icons/curier-store-logo.svg",
    apple: "/icons/curier-store-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <meta name="application-name" content="Store Courier" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Store Courier" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/curier-store-logo.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/curier-store-logo.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/curier-store-logo.svg" />
        
        {/* Standard Icons */}
        <link rel="icon" type="image/x-icon" sizes="16x16" href="/icons/curier-store-logo.ico" />
        <link rel="icon" type="image/x-icon" sizes="32x32" href="/icons/curier-store-logo.ico" />
        <link rel="icon" type="image/svg+xml" sizes="192x192" href="/icons/curier-store-logo.svg" />
        <link rel="icon" type="image/svg+xml" sizes="512x512" href="/icons/curier-store-logo.svg" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Safari */}
        <link rel="mask-icon" href="/icons/curier-store-logo.svg" color="#4f39f6" />
        
        {/* Theme */}
        <meta name="theme-color" content="#4f39f6" />
        <meta name="color-scheme" content="light dark" />
        
        {/* PWA Install Prompt */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TelegramBotInitializer />
        {children}
      </body>
    </html>
  );
}
