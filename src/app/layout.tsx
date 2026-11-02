import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astro — Space-Grade Knowledge Base",
  description:
    "Next-generation cosmic, local-first knowledge base with hybrid block-markdown editing and AI synthesis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-dvh antialiased`}
    >
      <body className="h-dvh bg-[#06080F] text-slate-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
