import type { MetadataRoute } from "next";

// Public routes that crawlers should index.
// Listed explicitly so any new authenticated/private routes default to disallow.
const PUBLIC_ALLOW = [
  "/",
  "/book/",
  "/u/",
  "/news/",
  "/authors/",
  "/series/",
  "/universes/",
  "/browse/",
  "/lists/",
  "/privacy",
  "/terms",
  "/contact",
];

const PRIVATE_DISALLOW = [
  "/library",
  "/library/",
  "/friends",
  "/friends/",
  "/account",
  "/account/",
  "/settings",
  "/settings/",
  "/feed",
  "/feed/",
  "/search",
  "/search/",
  "/import",
  "/import/",
  "/admin",
  "/admin/",
  "/login",
  "/signup",
  "/signup-success",
  "/forgot-password",
  "/reset-password",
  "/confirmed",
  "/auth/",
  "/api/",
  "/offline",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: "https://inprose.co.uk/sitemap.xml",
    host: "https://inprose.co.uk",
  };
}
