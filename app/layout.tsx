import type { Metadata } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-grotesque",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const TITLE = "Pepiros";
const DESCRIPTION =
  "A grounded research platform: every AI-surfaced claim stays bound to the exact quoted sentence it came from.";

export const metadata: Metadata = {
  // Same var MCP deep links use (.env.example, README's Configuration table) --
  // one "what's my own origin" env var, not two.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  // app/opengraph-image.tsx and app/icon.svg / app/apple-icon.tsx are picked
  // up automatically by Next's file convention -- title/description/type
  // here fill in the rest of the og:*/twitter:* tags around that image.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
