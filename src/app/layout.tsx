import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boat Map",
  description: "Interactive boat map with roadtrip planning tools.",
  keywords: ["Boat Map", "Routes", "Trip planner", "Locations", "Boats"],
  authors: [{ name: "Boat Map" }],
  icons: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.344.0/icons/sailboat.svg",
  },
  openGraph: {
    title: "Boat Map",
    description: "Interactive boat map with roadtrip planning tools.",
    url: "https://chat.z.ai",
    siteName: "Boat Map",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Boat Map",
    description: "Interactive boat map with roadtrip planning tools.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
