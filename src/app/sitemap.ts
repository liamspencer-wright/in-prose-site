import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://inprose.co.uk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Public book pages
  const { data: books } = await supabase
    .from("books_expanded")
    .select("isbn13")
    .order("isbn13");

  const bookPages: MetadataRoute.Sitemap = (books ?? []).map((book) => ({
    url: `${BASE_URL}/book/${book.isbn13}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Public user profiles (only users with a username)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username")
    .not("username", "is", null)
    .order("username");

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map((profile) => ({
    url: `${BASE_URL}/u/${profile.username}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...bookPages, ...profilePages];
}
