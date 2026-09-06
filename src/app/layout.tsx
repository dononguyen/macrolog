import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { TabBar } from "@/components/TabBar";
import { ThemeSync } from "@/components/ThemeSync";
import { THEME_SCRIPT } from "@/lib/theme-script";
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
  title: "macrolog",
  description: "A calorie and macro tracker.",
};

// Fills the notch area on phones and lets the browser pick the matching
// light or dark chrome, since the app supports both.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  viewportFit: "cover",
};

/**
 * Rendered per request rather than prerendered at build time. The CSP nonce
 * only exists once a request does, and a statically generated page would ship
 * script tags carrying a nonce from whenever it was built — which the browser
 * would refuse. Every page here is a client component reading localStorage, so
 * there was no meaningful server work to cache anyway.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inlined deliberately: it must run before the first paint, or the
            page flashes the wrong theme. Next nonces its own scripts; this one
            is ours, so it carries the nonce by hand. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeSync />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
