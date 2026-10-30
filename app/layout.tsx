import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "അക്ഷയ സഹായി",
  description: "Malayalam voice assistant for Akshaya / Kerala government services",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ml">
      <body>{children}</body>
    </html>
  );
}
