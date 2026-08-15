import type { Metadata } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/Toaster";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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
  "Substack for researchers, with a summariser you can check: publish the papers you read, and every claim stays bound to the sentence it came from.";

export const metadata: Metadata = {
  // Same var MCP deep links use (.env.example, README's Configuration table) --
  // one "what's my own origin" env var, not two.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  // app/opengraph-image.png, app/twitter-image.png, app/icon.png, and
  // app/apple-icon.png are picked up automatically by Next's file convention
  // -- title/description/type here fill in the rest of the og:*/twitter:*
  // tags around those images.
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
    // `dark` is no longer hardcoded here -- next-themes owns the class on
    // <html> now, and day is the default. suppressHydrationWarning is required
    // rather than optional: the theme script writes that class before React
    // hydrates, so server and client markup differ on <html> by design.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <OfflineBanner />
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
