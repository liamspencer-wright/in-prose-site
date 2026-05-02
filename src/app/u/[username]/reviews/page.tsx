import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import UserAvatar from "@/components/user-avatar";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  breadcrumbListSchema,
  reviewSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";
import { fetchPublicProfile, isProfileIndexable } from "@/lib/seo/profile";

export const revalidate = 300;

const MIN_REVIEWS_FOR_INDEX = 5;

type Props = {
  params: Promise<{ username: string }>;
};

type ReviewRow = {
  isbn13: string;
  title: string | null;
  image: string | null;
  first_author_name: string | null;
  rating: number | null;
  review: string;
  finished_at: string | null;
  created_at: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) return { title: "User not found", robots: { index: false } };

  const indexable = profile.public_review_count >= MIN_REVIEWS_FOR_INDEX;
  const name = profile.display_name ?? profile.username;
  return {
    title: `${name}'s book reviews`,
    description: `${profile.public_review_count} public ${
      profile.public_review_count === 1 ? "review" : "reviews"
    } by ${name} on in prose.`,
    alternates: { canonical: `/u/${profile.username}/reviews` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${name}'s book reviews`,
      url: `${SITE_URL}/u/${profile.username}/reviews`,
    },
  };
}

export default async function ProfileReviewsPage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_reviews_for_user", {
    p_user_id: profile.id,
    p_limit: 50,
    p_offset: 0,
  });
  const reviews = ((data ?? []) as ReviewRow[]).map((r) => ({
    ...r,
    rating: r.rating !== null ? Number(r.rating) : null,
  }));

  const name = profile.display_name ?? profile.username;
  const profileId = siteId(`/u/${profile.username}`);
  const indexable = isProfileIndexable(profile);

  const schemas = [
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name, url: profileId },
      { name: "Reviews", url: siteId(`/u/${profile.username}/reviews`) },
    ]),
    ...reviews.map((r) =>
      reviewSchema({
        itemReviewedId: siteId(`/book/${r.isbn13}`),
        authorName: name,
        authorUrl: profileId,
        ratingValue: r.rating,
        reviewBody: r.review,
        datePublished: r.finished_at ?? r.created_at ?? undefined,
      })
    ),
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
        / <span>Reviews</span>
      </nav>

      <header className="mb-8 flex items-center gap-4">
        <UserAvatar
          url={profile.avatar_url}
          name={profile.display_name}
          size={56}
          badgeType={profile.badge_type}
        />
        <div>
          <h1 className="text-3xl font-bold leading-tight">{name}&apos;s reviews</h1>
          <p className="text-text-muted">
            {profile.public_review_count} public{" "}
            {profile.public_review_count === 1 ? "review" : "reviews"}
          </p>
        </div>
      </header>

      {reviews.length === 0 ? (
        <p className="text-text-muted">No public reviews yet.</p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li
              key={`${r.isbn13}-${r.created_at}`}
              className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-(--radius-input) bg-bg-light">
                  {r.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.image}
                      alt={r.title ?? "Book cover"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">
                    <Link href={`/book/${r.isbn13}`} className="hover:text-accent">
                      {r.title ?? "Untitled"}
                    </Link>
                    {r.rating !== null && r.rating > 0 && (
                      <span className="ml-2 text-sm text-text-muted">
                        ★ {r.rating.toFixed(1)}
                      </span>
                    )}
                  </p>
                  {r.first_author_name && (
                    <p className="text-sm text-text-muted">{r.first_author_name}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                    {r.review}
                  </p>
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
