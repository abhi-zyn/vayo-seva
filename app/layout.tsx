import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Manjari, Outfit } from "next/font/google";
import { Haptics } from "@/components/Haptics";
import "./globals.css";

// Outfit matches the logo's geometric wordmark (Latin only); Anek Malayalam for
// Malayalam headings and buttons; Manjari for Malayalam body text.
const outfit = Outfit({ subsets: ["latin"], weight: ["600"], variable: "--font-outfit", display: "swap" });
const anek = Anek_Malayalam({ subsets: ["malayalam", "latin"], weight: ["600", "700"], variable: "--font-anek", display: "swap" });
const manjari = Manjari({ subsets: ["malayalam", "latin"], weight: ["400", "700"], variable: "--font-manjari", display: "swap" });

export const metadata: Metadata = {
  title: "VayoSeva · അക്ഷയ സഹായി",
  description: "Malayalam voice assistant for Kerala Akshaya e-centre services. Fewer Trips. Less Stress. Easier Services.",
  icons: { icon: "/brand/vayoseva-logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ml" className={`${outfit.variable} ${anek.variable} ${manjari.variable}`}>
      <body>
        <Haptics />
        {children}
      </body>
    </html>
  );
}
