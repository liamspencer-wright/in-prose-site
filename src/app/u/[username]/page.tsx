import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

type Props = {
  params: Promise<{ username: string }>;
};

type PublicBook = {
  isbn13: string;
  title: string | null;
  first_author_name: string | null;
  cover_url: string | null;
  status: string | null;
  rating: number | null;
  started_at: string | null;
};

type Favourite = {
  isbn13: string;
  position: number;
  title: string | null;
  cover_url: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, username")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) return { title: "User not found" };

  const title = `${profile.display_name ?? profile.username} (@${profile.username})`;
  return {
    title,
    description: `See what ${profile.display_name ?? profile.username} is reading on in prose.`,
    openGraph: {
      title,
      description: `See what ${profile.display_name ?? profile.username} is reading on in prose.`,
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, width: 200, height: 200 }],
      }),
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, description, joined_at")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) notFound();

  // Fetch public books
  const { data: books } = await supabase
    .from("user_books_expanded_all")
    .select("isbn13, title, first_author_name, cover_url, status, rating, started_at")
    .eq("user_id", profile.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  // Fetch favourites
  const { data: favouriteLinks } = await supabase
    .from("user_favourites")
    .select("isbn13, position")
    .eq("user_id", profile.id)
    .order("position", { ascending: true })
    .limit(5);

  let favourites: Favourite[] = [];
  if (favouriteLinks && favouriteLinks.length > 0) {
    const isbns = favouriteLinks.map((f) => f.isbn13);
    const { data: favBooks } = await supabase
      .from("user_books_expanded_all")
      .select("isbn13, title, cover_url")
      .eq("user_id", profile.id)
      .in("isbn13", isbns);

    if (favBooks) {
      favourites = favouriteLinks.map((f) => {
        const book = favBooks.find((b: { isbn13: string | null }) => b.isbn13 === f.isbn13);
        return {
          isbn13: f.isbn13,
          position: f.position,
          title: book?.title ?? null,
          cover_url: book?.cover_url ?? null,
        };
      });
    }
  }

  const publicBooks = (books ?? []) as PublicBook[];
  const currentlyReading = publicBooks.filter((b) => b.status === "reading");
  const finishedBooks = publicBooks.filter((b) => b.status === "finished");

  const memberSince = profile.joined_at
    ? new Date(profile.joined_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 max-sm:px-4">
      {/* Profile header */}
      <div className="mb-8 flex flex-col items-center text-center">
        {profile.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={profile.avatar_url}
            alt=""
            className="mb-4 h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
            {(profile.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold">
          {profile.display_name ?? profile.username}
        </h1>
        {profile.username && (
          <p className="text-text-muted">@{profile.username}</p>
        )}
        {profile.description && (
          <p className="mt-2 max-w-md text-sm text-text-muted">
            {profile.description}
          </p>
        )}
        {memberSince && (
          <p className="mt-1 text-xs text-text-subtle">
            Member since {memberSince}
          </p>
        )}
      </div>

      {/* Currently reading */}
      {currentlyReading.length > 0 && (
        <section className="mb-8">
          <div className="overflow-hidden rounded-(--radius-card) bg-[#1a3a5c]">
            <div className="flex items-center justify-center py-3">
              <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-bold text-white">
                Currently reading
              </span>
            </div>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4">
              {currentlyReading.map((book) => (
                <div
                  key={book.isbn13}
                  className="flex w-[280px] flex-shrink-0 snap-center gap-3 rounded-xl bg-white/10 p-3"
                >
                  <div className="h-[90px] w-[60px] flex-shrink-0 overflow-hidden rounded-lg">
                    {book.cover_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={book.cover_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-[8px] text-white/50">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
                      {book.title ?? "Untitled"}
                    </p>
                    {book.first_author_name && (
                      <p className="mt-0.5 text-xs text-white/60">
                        {book.first_author_name}
                      </p>
                    )}
                    {book.started_at && (
                      <p className="mt-1 text-[10px] text-white/40">
                        Started{" "}
                        {new Date(book.started_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Favourites */}
      {favourites.length > 0 && (
        <section className="mb-8">
          <div className="rounded-(--radius-card) bg-[#dce8f5] p-5">
            <div className="mb-4 flex justify-center">
              <span className="rounded-full bg-[#1a3a5c] px-4 py-1 text-xs font-bold text-white">
                Favourites
              </span>
            </div>
            <div className="flex justify-center gap-3">
              {Array.from({ length: 5 }, (_, i) => {
                const fav = favourites.find((f) => f.position === i + 1);
                return (
                  <div
                    key={i}
                    className="h-[90px] w-[60px] overflow-hidden rounded-lg"
                  >
                    {fav?.cover_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={fav.cover_url}
                        alt={fav.title ?? ""}
                        className="h-full w-full object-cover shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                      />
                    ) : fav ? (
                      <div className="flex h-full w-full items-center justify-center bg-white p-1 text-center text-[8px] text-text-subtle shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
                        {fav.title}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-[#1a3a5c]/20">
                        <span className="text-lg text-[#1a3a5c]/20">
                          {i + 1}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Library grid */}
      <section>
        <h2 className="mb-3 text-lg font-bold">
          Library
          <span className="ml-2 text-sm font-normal text-text-muted">
            {publicBooks.length} books &middot; {finishedBooks.length} finished
          </span>
        </h2>
        {publicBooks.length === 0 ? (
          <p className="py-8 text-center text-text-muted">
            No public books yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {publicBooks.map((book) => (
              <div
                key={book.isbn13}
                className="aspect-[2/3] overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              >
                {book.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={book.cover_url}
                    alt={book.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-bg-medium p-2 text-center">
                    <p className="text-xs font-semibold leading-tight text-text-muted">
                      {book.title ?? "Untitled"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}
