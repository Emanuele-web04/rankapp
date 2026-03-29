import type { Metadata } from "next";
import "./globals.css";
import { geistSans, jetBrainsMono } from "@/lib/fonts";

// FILE: layout.tsx
// Purpose: Defines global metadata, fonts, and document shell for the RankApp app.
// Layer: App Router layout
// Exports: metadata, RootLayout
// Depends on: next/font/google, globals.css

export const metadata: Metadata = {
  title: "RankApp",
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
    <html lang="en" className={`${geistSans.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
