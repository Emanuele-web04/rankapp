import { Geist, JetBrains_Mono } from "next/font/google";

// FILE: fonts.ts
// Purpose: Centralizes app font configuration so layouts and components can share exact font classes.
// Layer: App utility
// Exports: geistSans, jetBrainsMono

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});
