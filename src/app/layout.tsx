import type { Metadata } from "next";
import { Crimson_Text } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "in prose – Books and data — perfectly bound.",
  description:
    "Track your reading, connect with friends, and discover books with In Prose.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
