import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";

import { themeBootstrapScript } from "@/components/shell/theme";
import "./globals.css";

/**
 * Three families on a real contrast axis, rather than two near-identical
 * grotesques. Geist was the previous choice and it's the Next.js default —
 * which is exactly why it reads as "unstyled scaffold" rather than as a brand.
 *
 * Fraunces is a variable serif; SOFT and WONK are pulled to 0 in globals.css so
 * it lands as a confident editorial face rather than the playful cut it ships
 * with by default. `opsz` lets the same file work at 18px and 56px.
 */
const display = Fraunces({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: "variable",
  // The true italic, not a synthesised slant — the hero sets one line in it and
  // an obliqued serif at 80px is immediately obvious as fake.
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

/** Body and UI: an editorial grotesque that holds up at 13px. */
const sans = Schibsted_Grotesk({
  variable: "--ff-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Data labels and code only. */
const mono = IBM_Plex_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
    { media: "(prefers-color-scheme: light)", color: "#fef6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#140d10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
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
