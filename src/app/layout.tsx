import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// FILE: layout.tsx
// Purpose: Defines global metadata, fonts, and document shell for the RankApp app.
// Layer: App Router layout
// Exports: metadata, RootLayout
// Depends on: next/font/google, globals.css

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
