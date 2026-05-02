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
  searchParams: Promise<{ status?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  reading: "Currently reading",
  finished: "Finished",
  to_read: "To read",
  dnf: "Did not finish",
};

const STATUSES = ["reading", "finished", "to_read", "dnf"] as const;

type LibraryRow = {
  isbn13: string;
  title: string | null;
  image: string | null;
  pub_year: number | null;
  first_author_name: string | null;
  status: string | null;
  rating: number | null;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { username } = await params;
  const { status } = await searchParams;
  const profile = await fetchPublicProfile(username);
  if (!profile) return { title: "User not found", robots: { index: false } };

  const indexable = isProfileIndexable(profile) && profile.public_book_count >= 1;
  const name = profile.display_name ?? profile.username;
  const filterLabel = status && STATUS_LABELS[status]
    ? ` — ${STATUS_LABELS[status]}`
    : "";

  return {
    title: `${name}'s library${filterLabel}`,
    description: `${profile.public_book_count} public ${
      profile.public_book_count === 1 ? "book" : "books"
    } in ${name}'s library on in prose.`,
    alternates: {
      canonical: `/u/${profile.username}/library${
        status && STATUSES.includes(status as (typeof STATUSES)[number]) ? `?status=${status}` : ""
      }`,
    },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${name}'s library`,
      description: `${profile.public_book_count} public books on in prose.`,
      url: `${SITE_URL}/u/${profile.username}/library`,
    },
  };
}

export default async function ProfileLibraryPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { status } = await searchParams;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const filter =
    status && STATUSES.includes(status as (typeof STATUSES)[number])
      ? (status as (typeof STATUSES)[number])
      : null;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_library_for_user", {
    p_user_id: profile.id,
    p_status: filter,
    p_limit: 60,
    p_offset: 0,
  });
  const books = ((data ?? []) as LibraryRow[]).map((b) => ({
    ...b,
    rating: b.rating !== null ? Number(b.rating) : null,
  }));

  const name = profile.display_name ?? profile.username;
  const indexable = isProfileIndexable(profile);

  const schemas = [
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name, url: siteId(`/u/${profile.username}`) },
      {
        name: "Library",
        url: siteId(`/u/${profile.username}/library`),
      },
    ]),
    itemListSchema({
      name: `${name}'s library`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      items: books.map((b, i) => ({
        url: siteId(`/book/${b.isbn13}`),
        name: b.title ?? "Untitled",
        position: i + 1,
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
        / <span>Library</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold leading-tight">{name}&apos;s library</h1>
        <p className="mt-2 text-text-muted">
          {profile.public_book_count} public{" "}
          {profile.public_book_count === 1 ? "book" : "books"}
          {profile.public_finished_count > 0 &&
            ` · ${profile.public_finished_count} finished`}
        </p>
      </header>

      {/* Status filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={`/u/${profile.username}/library`}
          className={chipClass(filter === null)}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/u/${profile.username}/library?status=${s}`}
            className={chipClass(filter === s)}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {books.length === 0 ? (
        <p className="text-text-muted">No public books in this view.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-5 max-sm:grid-cols-2">
          {books.map((b) => (
            <li key={b.isbn13}>
              <Link href={`/book/${b.isbn13}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-(--radius-input) bg-bg-medium">
                  {b.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={b.image}
                      alt={b.title ?? "Book cover"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                  {b.title ?? "Untitled"}
                </p>
                {b.first_author_name && (
                  <p className="text-xs text-text-muted">{b.first_author_name}</p>
                )}
                {b.rating !== null && b.rating > 0 && (
                  <p className="text-xs text-text-subtle">
                    ★ {Number(b.rating).toFixed(1)}
                  </p>
                )}
              </Link>
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

function chipClass(active: boolean): string {
  return [
    "rounded-full px-3 py-1.5 text-sm",
    active
      ? "bg-accent text-text-on-accent"
      : "border border-border-subtle bg-bg-medium hover:bg-accent-blue/5",
  ].join(" ");
}
