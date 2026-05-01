"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];
type NewsPostType = NewsPost["type"];

const TYPE_OPTIONS: { value: NewsPostType; label: string }[] = [
  { value: "featured_review", label: "Featured Review" },
  { value: "release_notes_app", label: "App Release Notes" },
  { value: "release_notes_website", label: "Website Release Notes" },
  { value: "article", label: "Article" },
  { value: "announcement", label: "Announcement" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewsPostForm({ post }: { post?: NewsPost }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [type, setType] = useState<NewsPostType>(post?.type ?? "article");
  const [body, setBody] = useState(post?.body ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!post);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title,
      slug,
      type,
      body,
      excerpt: excerpt || null,
      cover_image_url: coverImageUrl || null,
      status,
      published_at:
        status === "published"
          ? (post?.published_at ?? new Date().toISOString())
          : null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (post) {
      ({ error: err } = await supabase
        .from("news_posts")
        .update(payload)
        .eq("id", post.id));
    } else {
      ({ error: err } = await supabase.from("news_posts").insert(payload));
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/admin/news");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error: err } = await supabase
      .from("news_posts")
      .delete()
      .eq("id", post!.id);
    setDeleting(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/admin/news");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-(--radius-input) border border-border bg-bg-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <p className="rounded-(--radius-input) bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Title</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Post title"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Slug</label>
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManuallyEdited(true);
          }}
          required
          placeholder="url-friendly-slug"
        />
        <p className="mt-1 text-xs text-text-muted">
          URL: /news/{slug || "…"}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Type</label>
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as NewsPostType)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Excerpt</label>
        <input
          className={inputClass}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short summary shown in feed cards (optional)"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          Cover image URL
        </label>
        <input
          className={inputClass}
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://… (optional)"
          type="url"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Body</label>
        <textarea
          className={`${inputClass} min-h-[320px] resize-y font-mono text-xs leading-relaxed`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your content here. Use blank lines to separate paragraphs."
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Status</label>
        <div className="flex gap-3">
          {(["draft", "published"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-(--radius-input) border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                status === s
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:bg-border-subtle"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-(--radius-input) bg-accent px-6 py-2.5 text-sm font-semibold text-text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : post ? "Save changes" : "Create post"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/news")}
            className="rounded-(--radius-input) border border-border px-5 py-2.5 text-sm font-semibold hover:bg-border-subtle"
          >
            Cancel
          </button>
        </div>

        {post && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-error hover:underline"
          >
            Delete
          </button>
        )}
        {post && showDeleteConfirm && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-error">Delete this post?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-semibold text-error hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-sm text-text-muted hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
