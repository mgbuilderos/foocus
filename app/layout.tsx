import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import {
  BRAND,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "./_lib/site";
import { CSPostHogProvider } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Child routes set only their own name; /admin renders "Telemetry · FOOCUS".
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "focus timer",
    "focus sprint",
    "pomodoro",
    "deep work",
    "minimalist productivity",
    "privacy-first",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  // A timer renders strings like "25:00"; iOS data detectors will otherwise
  // turn them into tappable links and break the layout.
  formatDetection: { telephone: false, date: false, address: false },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    // Opaque, not "black-translucent": the web view must keep starting below
    // the status bar so the h-svh layout is not pushed under it.
    statusBarStyle: "black",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    // Images come from app/opengraph-image.tsx — Next's file convention takes
    // precedence over anything declared here and emits a hashed absolute URL.
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // Images come from app/twitter-image.tsx, as above.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * Next 14 requires viewport and themeColor to live here, not in `metadata`.
 *
 * themeColor tracks `prefers-color-scheme` because next-themes runs with
 * `enableSystem` (its default), so the OS preference is what the app shows
 * until the user toggles. Colours are the `--mesh-bg` base values the body
 * actually paints — see app/_lib/site.ts.
 *
 * `viewportFit: "cover"` lets the h-svh layout fill notched displays.
 * maximumScale / userScalable are intentionally left unset so pinch-zoom
 * stays available.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.backgroundLight },
    { media: "(prefers-color-scheme: dark)", color: BRAND.backgroundDark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 transition-colors duration-500`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <CSPostHogProvider>
            {children}
          </CSPostHogProvider>
        </ThemeProvider>
      </body>

    </html>
  );
}
