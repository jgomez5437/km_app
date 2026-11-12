import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#06080F",
  colorScheme: "dark",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Astro — Cosmic Knowledge Vault",
  description:
    "Next-generation cosmic, local-first knowledge base with hybrid block-markdown editing and AI synthesis.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Astro",
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
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} dark h-dvh antialiased`}
    >
      <body className="h-dvh bg-[#06080F] text-slate-100 overflow-hidden font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
