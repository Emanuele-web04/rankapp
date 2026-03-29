import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// FILE: layout.tsx
// Purpose: Defines global metadata, fonts, and document shell for the Rank Atlas app.
// Layer: App Router layout
// Exports: metadata, RootLayout
// Depends on: next/font/google, globals.css

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Rank Atlas",
  description: "Check an app's category ranking across Apple App Store storefronts.",
};

// ─── ENTRY POINT ─────────────────────────────────────────────

// Applies the shared font stack and document metadata to every route.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", spaceGrotesk.variable, plexMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
