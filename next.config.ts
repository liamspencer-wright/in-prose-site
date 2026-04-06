import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oqxodsatbzdkewvbwtrt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.isbndb.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
    ],
  },
};

export default withSerwist(nextConfig);
