import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pepiros",
  description:
    "Turns a research PDF into a living knowledge graph where every generated claim is bound to a located quote.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
