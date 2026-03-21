import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, username")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) {
    return { title: "User not found" };
  }

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

  // Look up profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, description")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Fetch public books
  const { data: books } = await supabase
    .from("user_books_expanded_all")
    .select(
      "isbn13, title, first_author_name, cover_url, status, rating, finished_at"
    )
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

  // Get book metadata for favourites
  let favourites: { isbn13: string; title: string | null; cover_url: string | null; first_author_name: string | null; position: number }[] = [];
  if (favouriteLinks && favouriteLinks.length > 0) {
    const isbns = favouriteLinks.map((f) => f.isbn13);
    const { data: favBooks } = await supabase
      .from("user_books_expanded_all")
      .select("isbn13, title, cover_url, first_author_name")
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
          first_author_name: book?.first_author_name ?? null,
        };
      });
    }
  }

  const publicBooks = (books ?? []) as {
    isbn13: string;
    title: string | null;
    first_author_name: string | null;
    cover_url: string | null;
    status: string | null;
    rating: number | null;
  }[];

  const finishedCount = publicBooks.filter((b) => b.status === "finished").length;
  const readingCount = publicBooks.filter((b) => b.status === "reading").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-5 max-sm:flex-col max-sm:text-center">
        {profile.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
            {(profile.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-text-muted">@{profile.username}</p>
          {profile.description && (
            <p className="mt-2 text-sm text-text-muted">
              {profile.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 flex gap-6 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4">
        <Stat value={publicBooks.length} label="Books" />
        <Stat value={finishedCount} label="Finished" />
        <Stat value={readingCount} label="Reading" />
      </div>

      {/* Favourites */}
      {favourites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Favourites</h2>
          <div className="grid grid-cols-5 gap-2">
            {favourites.map((fav) => (
              <div
                key={fav.isbn13}
                className="aspect-[2/3] overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              >
                {fav.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={fav.cover_url}
                    alt={fav.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-bg-medium p-1 text-center text-[10px] text-text-subtle">
                    {fav.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Public library */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Library</h2>
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

      {/* Footer link */}
      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
