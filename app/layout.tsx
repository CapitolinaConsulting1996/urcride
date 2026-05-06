import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import InstallPwa from "@/components/InstallPwa";

export const metadata: Metadata = {
  title: "URCRide - Carpooling Unione Rugby Capitolina",
  description: "Condividi i passaggi con la comunità URC verso Via Flaminia 867",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "URCRide",
    startupImage: [
      // iPhone 14 Pro Max, 15 Pro Max (430×932)
      { url: "/splash/splash-430x932.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      // iPhone 14, 15 (390×844)
      { url: "/splash/splash-390x844.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      // iPhone SE / older (375×667)
      { url: "/splash/splash-375x667.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a5c2e",
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
    <html lang="it" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <SwRegister />
        <InstallPwa />
      </body>
    </html>
  );
}
