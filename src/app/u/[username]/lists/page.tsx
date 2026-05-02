import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  itemListSchema,
  breadcrumbListSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";
import { fetchPublicProfile, isProfileIndexable } from "@/lib/seo/profile";

export const revalidate = 300;

type Props = {
  params: Promise<{ username: string }>;
};

type StackRow = {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
  cover_isbn13: string | null;
  updated_at: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) return { title: "User not found", robots: { index: false } };

  const indexable = profile.public_stack_count >= 1;
  const name = profile.display_name ?? profile.username;
  return {
    title: `${name}'s book lists`,
    description: `${profile.public_stack_count} public ${
      profile.public_stack_count === 1 ? "list" : "lists"
    } curated by ${name} on in prose.`,
    alternates: { canonical: `/u/${profile.username}/lists` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${name}'s book lists`,
      url: `${SITE_URL}/u/${profile.username}/lists`,
    },
  };
}

export default async function ProfileListsPage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_stacks_for_user", {
    p_user_id: profile.id,
  });
  const stacks = ((data ?? []) as StackRow[]).map((s) => ({
    ...s,
    item_count: Number(s.item_count),
  }));

  const name = profile.display_name ?? profile.username;
  const indexable = isProfileIndexable(profile);

  const schemas = [
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name, url: siteId(`/u/${profile.username}`) },
      {
        name: "Lists",
        url: siteId(`/u/${profile.username}/lists`),
      },
    ]),
    itemListSchema({
      name: `${name}'s book lists`,
      items: stacks.map((s) => ({
        // Stacks don't have public detail pages yet — link to /lists or omit?
        // Use the profile-lists URL with a fragment so AI/crawler signals
        // remain valid; update once /u/[username]/lists/[stackId] ships.
        url: `${SITE_URL}/u/${profile.username}/lists#${s.id}`,
        name: s.name,
      })),
    }),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      {indexable && <JsonLd schemas={schemas} />}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/u/${profile.username}`} className="hover:text-text-primary">
          {name}
        </Link>{" "}
        / <span>Lists</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight">{name}&apos;s book lists</h1>
        <p className="mt-2 text-text-muted">
          {profile.public_stack_count} public{" "}
          {profile.public_stack_count === 1 ? "list" : "lists"}
        </p>
      </header>

      {stacks.length === 0 ? (
        <p className="text-text-muted">No public lists yet.</p>
      ) : (
        <ul className="space-y-3">
          {stacks.map((s) => (
            <li
              key={s.id}
              id={s.id}
              className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-(--radius-input) bg-bg-light">
                  {s.cover_isbn13 ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`https://images.isbndb.com/covers/${s.cover_isbn13}.jpg`}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-text-subtle">
                    {s.item_count} {s.item_count === 1 ? "book" : "books"}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-sm text-text-muted">{s.description}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href={`/u/${profile.username}`} className="text-accent hover:underline">
          ← Back to {name}&apos;s profile
        </Link>
      </p>
    </div>
  );
}
