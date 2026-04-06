import type { Metadata } from "next";
import { Crimson_Text } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { CookieConsent } from "@/components/cookie-consent";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "in prose – Books and data — perfectly bound.",
    template: "%s – In Prose",
  },
  description:
    "Track what you read, see how your friends read, and discover your next favourite book. In Prose is a social book tracking app.",
  metadataBase: new URL("https://inprose.co.uk"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "in prose – Books and data — perfectly bound.",
    description:
      "Track what you read, see how your friends read, and discover your next favourite book.",
    url: "https://inprose.co.uk",
    siteName: "In Prose",
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "in prose – Books and data — perfectly bound.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "in prose – Books and data — perfectly bound.",
    description:
      "Track what you read, see how your friends read, and discover your next favourite book.",
    images: ["/og-image.png"],
  },
  manifest: "/site.webmanifest",
  other: {
    "theme-color": "#fbf1ec",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${crimsonText.variable} font-serif bg-bg-light text-text-primary antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-4 left-4 z-[100] rounded-(--radius-input) bg-accent px-4 py-2 font-bold text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <CookieConsent />
          <PwaInstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
