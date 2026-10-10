import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Noto_Sans_Devanagari } from "next/font/google";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JalRakshak — Delhi flood early warning & safe routing",
  description:
    "Hyperlocal flood risk for Delhi's underpasses: explainable risk index, 3-tap citizen reports verified by AI, and safe routing.",
  applicationName: "JalRakshak",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JalRakshak",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#030b1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${deva.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ToastProvider>
          <AppProvider>
            {children}
            <ServiceWorkerRegister />
          </AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
