import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  featured_review: "Featured Review",
  release_notes_app: "App Release Notes",
  release_notes_website: "Website Release Notes",
  article: "Article",
  announcement: "Announcement",
};

export default async function AdminNewsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await supabase
    .from("news_posts")
    .select("id, title, slug, type, status, published_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">News posts</h1>
          <p className="mt-1 text-text-muted">{posts?.length ?? 0} posts</p>
        </div>
        <Link
          href="/admin/news/new"
          className="rounded-(--radius-input) bg-accent px-5 py-2.5 text-sm font-semibold text-text-on-accent hover:bg-accent-hover"
        >
          New post
        </Link>
      </div>

      {!posts?.length ? (
        <p className="text-text-muted">No posts yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {TYPE_LABELS[post.type] ?? post.type}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      post.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-border text-text-muted"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
                <p className="truncate font-semibold">{post.title}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {post.status === "published" && post.published_at
                    ? `Published ${new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : `Updated ${new Date(post.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>
              <Link
                href={`/admin/news/${post.id}/edit`}
                className="shrink-0 rounded-(--radius-input) border border-border px-4 py-1.5 text-sm font-semibold hover:bg-border-subtle"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
