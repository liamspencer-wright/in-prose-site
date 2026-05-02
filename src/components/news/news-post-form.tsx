"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database, Json } from "@/types/database";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];
type NewsPostType = NewsPost["type"];

const TYPE_OPTIONS: { value: NewsPostType; label: string }[] = [
  { value: "featured_review", label: "Featured Review" },
  { value: "release_notes_app", label: "App Release Notes" },
  { value: "release_notes_website", label: "Website Release Notes" },
  { value: "article", label: "Article" },
  { value: "announcement", label: "Announcement" },
  { value: "book_spotlight", label: "Book Spotlight" },
  { value: "book_list", label: "Book List" },
];

const MAX_LIST_ENTRIES = 10;
const MAX_IMAGES = 6;

type BookSearchResult = {
  id: string;
  canonical_title: string;
  canonical_author: string;
  image: string | null;
};

type BookListEntryDraft = {
  book: BookSearchResult | null;
  note: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputClass =
  "w-full rounded-(--radius-input) border border-border bg-bg-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

export function NewsPostForm({ post }: { post?: NewsPost }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

  // Spotlight book
  const [spotlightBook, setSpotlightBook] = useState<BookSearchResult | null>(null);

  // Book list entries
  const [listEntries, setListEntries] = useState<BookListEntryDraft[]>([]);

  // Images
  const [imageUrls, setImageUrls] = useState<string[]>(post?.image_urls ?? []);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slugManuallyEdited) setSlug(slugify(title));
  }, [title, slugManuallyEdited]);

  // Hydrate book selections from existing post
  useEffect(() => {
    if (!post) return;

    if (post.type === "book_spotlight" && post.spotlight_book_group_id) {
      hydrateGroups([post.spotlight_book_group_id]).then((map) => {
        const m = map.get(post.spotlight_book_group_id!);
        if (m) setSpotlightBook(m);
      });
    }

    if (post.type === "book_list" && Array.isArray(post.book_list_entries)) {
      const raw = post.book_list_entries as { book_group_id: string; note?: string }[];
      const ids = raw.map((e) => e.book_group_id).filter(Boolean);
      hydrateGroups(ids).then((map) => {
        setListEntries(
          raw.map((e) => ({
            book: map.get(e.book_group_id) ?? null,
            note: e.note ?? "",
          })),
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateGroups = useCallback(
    async (ids: string[]): Promise<Map<string, BookSearchResult>> => {
      const out = new Map<string, BookSearchResult>();
      if (ids.length === 0) return out;

      const { data: groups } = await supabase
        .from("book_groups")
        .select("id, canonical_title, canonical_author")
        .in("id", ids);
      for (const g of groups ?? []) {
        out.set(g.id, {
          id: g.id,
          canonical_title: g.canonical_title,
          canonical_author: g.canonical_author,
          image: null,
        });
      }

      const { data: links } = await supabase
        .from("book_isbn_groups")
        .select("group_id, isbn13")
        .in("group_id", ids);
      const isbns = (links ?? []).map((l) => l.isbn13);
      if (isbns.length > 0) {
        const { data: books } = await supabase
          .from("books_expanded")
          .select("isbn13, image")
          .in("isbn13", isbns);
        const isbnImage = new Map<string, string | null>();
        for (const b of books ?? []) {
          if (b.isbn13) isbnImage.set(b.isbn13, b.image);
        }
        for (const link of links ?? []) {
          const meta = out.get(link.group_id);
          if (!meta || meta.image) continue;
          const img = isbnImage.get(link.isbn13);
          if (img) meta.image = img;
        }
      }

      return out;
    },
    [supabase],
  );

  function pickImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const total = imageUrls.length + pendingImages.length;
    const available = MAX_IMAGES - total;
    const toAdd = arr.slice(0, Math.max(0, available));
    setPendingImages((prev) => [...prev, ...toAdd]);
    setPendingPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeUploadedImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPendingImages(): Promise<string[]> {
    if (pendingImages.length === 0) return [];
    const uploaded: string[] = [];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const prefix = user?.id ?? "anon";
    for (const img of pendingImages) {
      const ext = img.name.split(".").pop() ?? "jpg";
      const path = `${prefix}/news_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("news-images")
        .upload(path, img, { contentType: img.type, upsert: true });
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
      const {
        data: { publicUrl },
      } = supabase.storage.from("news-images").getPublicUrl(path);
      uploaded.push(publicUrl);
    }
    return uploaded;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const newImageUrls = await uploadPendingImages();
      const finalImageUrls = [...imageUrls, ...newImageUrls];

      let spotlightId: string | null = null;
      let listJson: Json | null = null;

      if (type === "book_spotlight") {
        if (!spotlightBook) throw new Error("Pick a book for the spotlight.");
        spotlightId = spotlightBook.id;
      } else if (type === "book_list") {
        const valid = listEntries.filter((e) => e.book);
        if (valid.length === 0) throw new Error("Add at least one book to the list.");
        listJson = valid.map((e) => ({
          book_group_id: e.book!.id,
          note: e.note || "",
        })) as Json;
      }

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
        spotlight_book_group_id: spotlightId,
        book_list_entries: listJson,
        image_urls: finalImageUrls,
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

      if (err) throw new Error(err.message);

      router.push("/admin/news");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
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
        <p className="mt-1 text-xs text-text-muted">URL: /news/{slug || "…"}</p>
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

      {type === "book_spotlight" && (
        <SpotlightPicker
          supabase={supabase}
          hydrateGroups={hydrateGroups}
          selected={spotlightBook}
          onSelect={setSpotlightBook}
        />
      )}

      {type === "book_list" && (
        <BookListBuilder
          supabase={supabase}
          hydrateGroups={hydrateGroups}
          entries={listEntries}
          onChange={setListEntries}
        />
      )}

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
        <label className="mb-1.5 block text-sm font-semibold">Cover image URL</label>
        <input
          className={inputClass}
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://… (optional, takes priority over uploaded gallery for OG)"
          type="url"
        />
      </div>

      <ImageUploader
        imageUrls={imageUrls}
        pendingPreviews={pendingPreviews}
        onPick={pickImages}
        onRemoveUploaded={removeUploadedImage}
        onRemovePending={removePendingImage}
        fileInputRef={fileInputRef}
      />

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

// --- Book search field ---

type SupabaseClient = ReturnType<typeof createClient>;

function BookSearchField({
  supabase,
  hydrateGroups,
  onPick,
  placeholder = "Search canonical title…",
}: {
  supabase: SupabaseClient;
  hydrateGroups: (ids: string[]) => Promise<Map<string, BookSearchResult>>;
  onPick: (book: BookSearchResult) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("book_groups")
        .select("id, canonical_title, canonical_author")
        .ilike("canonical_title", `%${q}%`)
        .order("canonical_title")
        .limit(10);
      if (cancelled) return;
      const ids = (data ?? []).map((g) => g.id);
      const map = await hydrateGroups(ids);
      if (cancelled) return;
      setResults((data ?? []).map((g) => map.get(g.id) ?? {
        id: g.id,
        canonical_title: g.canonical_title,
        canonical_author: g.canonical_author,
        image: null,
      }));
      setSearching(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, supabase, hydrateGroups]);

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && q.trim() && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-(--radius-input) border border-border bg-bg-light shadow-lg">
          {searching && (
            <div className="px-3 py-2 text-xs text-text-muted">Searching…</div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-muted">No matches</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onPick(r);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-border-subtle"
            >
              {r.image ? (
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-border-subtle">
                  <Image src={r.image} alt={r.canonical_title} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-12 w-9 shrink-0 rounded-sm bg-border-subtle" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {r.canonical_title}
                </p>
                <p className="truncate text-xs text-text-muted">{r.canonical_author}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Spotlight picker ---

function SpotlightPicker({
  supabase,
  hydrateGroups,
  selected,
  onSelect,
}: {
  supabase: SupabaseClient;
  hydrateGroups: (ids: string[]) => Promise<Map<string, BookSearchResult>>;
  selected: BookSearchResult | null;
  onSelect: (book: BookSearchResult | null) => void;
}) {
  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-bg-light p-4">
      <label className="mb-2 block text-sm font-semibold">Spotlight book</label>
      {selected ? (
        <div className="flex items-center gap-3">
          {selected.image ? (
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-border-subtle">
              <Image src={selected.image} alt={selected.canonical_title} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-20 w-14 shrink-0 rounded-sm bg-border-subtle" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold">{selected.canonical_title}</p>
            <p className="text-xs text-text-muted">{selected.canonical_author}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-error hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <BookSearchField
          supabase={supabase}
          hydrateGroups={hydrateGroups}
          onPick={onSelect}
        />
      )}
    </div>
  );
}

// --- Book list builder ---

function BookListBuilder({
  supabase,
  hydrateGroups,
  entries,
  onChange,
}: {
  supabase: SupabaseClient;
  hydrateGroups: (ids: string[]) => Promise<Map<string, BookSearchResult>>;
  entries: BookListEntryDraft[];
  onChange: (entries: BookListEntryDraft[]) => void;
}) {
  function update(idx: number, patch: Partial<BookListEntryDraft>) {
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function remove(idx: number) {
    onChange(entries.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...entries];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }
  function addEntry() {
    if (entries.length >= MAX_LIST_ENTRIES) return;
    onChange([...entries, { book: null, note: "" }]);
  }

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-bg-light p-4">
      <div className="mb-3 flex items-center justify-between">
        <label className="block text-sm font-semibold">
          Book list ({entries.length}/{MAX_LIST_ENTRIES})
        </label>
        <button
          type="button"
          onClick={addEntry}
          disabled={entries.length >= MAX_LIST_ENTRIES}
          className="rounded-(--radius-input) border border-accent px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50"
        >
          + Add entry
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-text-muted">No entries yet — add up to {MAX_LIST_ENTRIES}.</p>
      )}

      <ol className="space-y-3">
        {entries.map((entry, i) => (
          <li
            key={i}
            className="rounded-(--radius-input) border border-border bg-bg-medium p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-bold text-accent w-6">{i + 1}.</span>
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-sm border border-border px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === entries.length - 1}
                  className="rounded-sm border border-border px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-sm border border-error px-2 py-0.5 text-xs text-error"
                >
                  Remove
                </button>
              </div>
            </div>

            {entry.book ? (
              <div className="mb-2 flex items-center gap-3">
                {entry.book.image ? (
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-border-subtle">
                    <Image
                      src={entry.book.image}
                      alt={entry.book.canonical_title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-12 shrink-0 rounded-sm bg-border-subtle" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{entry.book.canonical_title}</p>
                  <p className="text-xs text-text-muted">{entry.book.canonical_author}</p>
                </div>
                <button
                  type="button"
                  onClick={() => update(i, { book: null })}
                  className="text-xs text-error hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <BookSearchField
                supabase={supabase}
                hydrateGroups={hydrateGroups}
                onPick={(b) => update(i, { book: b })}
              />
            )}

            <textarea
              className={`${inputClass} mt-2 min-h-[60px] resize-y text-xs`}
              value={entry.note}
              onChange={(e) => update(i, { note: e.target.value })}
              placeholder="Note about this book (optional)"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Image uploader ---

function ImageUploader({
  imageUrls,
  pendingPreviews,
  onPick,
  onRemoveUploaded,
  onRemovePending,
  fileInputRef,
}: {
  imageUrls: string[];
  pendingPreviews: string[];
  onPick: (files: FileList | null) => void;
  onRemoveUploaded: (i: number) => void;
  onRemovePending: (i: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const total = imageUrls.length + pendingPreviews.length;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">
        Images ({total}/{MAX_IMAGES})
      </label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {imageUrls.map((url, i) => (
          <div
            key={`u-${i}`}
            className="relative aspect-square overflow-hidden rounded-(--radius-input) bg-border-subtle"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveUploaded(i)}
              className="absolute right-1 top-1 rounded-full bg-bg-light/90 px-2 py-0.5 text-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        {pendingPreviews.map((url, i) => (
          <div
            key={`p-${i}`}
            className="relative aspect-square overflow-hidden rounded-(--radius-input) border border-dashed border-accent bg-border-subtle"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemovePending(i)}
              className="absolute right-1 top-1 rounded-full bg-bg-light/90 px-2 py-0.5 text-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        {total < MAX_IMAGES && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-(--radius-input) border border-dashed border-border text-text-muted hover:border-accent hover:text-accent">
            <span className="text-2xl">+</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Up to {MAX_IMAGES} images. Pending uploads are saved when you click Save.
      </p>
    </div>
  );
}
