import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URCRide - Carpooling Unione Rugby Capitolina",
  description: "Condividi i passaggi con la comunità URC verso Via Flaminia 867",
  icons: {
    icon: "https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
