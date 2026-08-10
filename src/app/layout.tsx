import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { themeBootstrapScript } from "@/components/shell/theme";
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
  title: {
    default: "Achi — study smarter",
    template: "%s · Achi",
  },
  description:
    "Flashcards, quizzes, and spaced repetition. Build a deck from your notes and actually remember it.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1212" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The bootstrap script writes data-theme before React sees the document,
      // so the server HTML and the first client render disagree by design.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
