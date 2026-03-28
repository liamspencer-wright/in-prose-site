import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/book/", "/u/", "/privacy", "/terms", "/contact"],
        disallow: [
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
          "/login",
          "/signup",
          "/signup-success",
          "/forgot-password",
          "/reset-password",
          "/confirmed",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://inprose.co.uk/sitemap.xml",
  };
}
