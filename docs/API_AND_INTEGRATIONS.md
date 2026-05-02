# API Routes & Integrations

All server-side endpoints owned by `in-prose-site` and the third-party integrations they call. Today **everything lives in App Router `route.ts` files** — `netlify/functions/` is empty.

> **Companion docs:**
> - `AUTHENTICATION.md` — request-time auth (`auth.getUser`, 401s)
> - `inprose-v2/docs/SEARCH_AND_METADATA.md` — shared ISBNdb pipeline (iOS reference)
> - `inprose-v2/docs/DATABASE_SCHEMA.md` — `books`, `book_authors`, `book_lookup_failures`, `user_books`, RPCs

---

## Decision rule: API route vs Netlify function

| App Router `route.ts` (default) | Netlify function |
|---|---|
| Per-request server work | Long-running cron |
| Streaming responses (NDJSON, SSE) | Anything App Router can't do |
| Anything called from client `fetch()` | Webhooks needing total deployment isolation |
| ISR / revalidation control | (no current use case here) |

`netlify/functions/` is wired up in `netlify.toml` (`directory = "netlify/functions"`, `node_bundler = "esbuild"`) but **currently empty**. Default to a `route.ts` until you have a concrete reason not to.

---

## Endpoints

### `POST /api/signup` — marketing waitlist

**Source:** `src/app/api/signup/route.ts`
**Auth:** none — public endpoint
**Caller:** `src/app/signup-form.tsx` (the waitlist form on the marketing home)

> ⚠️ **This is for the waitlist, not auth signup.** Auth signup is client-side via `supabase.auth.signUp()` — see `AUTHENTICATION.md`.

**Request:**
```json
{ "name": "...", "email": "...", "token": "<turnstile-token>" }
```

**Behaviour:**
1. Validates `name`, `email`, `token` are present and email is well-formed.
2. Verifies the Cloudflare Turnstile token by POSTing to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`.
3. POSTs to `${SUPABASE_URL}/rest/v1/signups` using **the service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS on `signups`.
4. Returns:
   - `200 { success: true }` on success
   - `400` for bad input or captcha failure
   - `409 { error: "already_signed_up" }` for duplicate email (`23505`)
   - `500` for other DB errors

**Env vars:**
- `TURNSTILE_SECRET_KEY` — captcha verification
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — service-role insert

> ⚠️ The service-role key is never exposed to the browser. Keep this endpoint's logic on the server.

---

### `GET /api/search` — ISBNdb proxy

**Source:** `src/app/api/search/route.ts`
**Auth:** none (TODO: should this require auth?)
**Caller:** `src/app/(protected)/search/page.tsx`

**Request:**
```
GET /api/search?q=<query>
```
- `q` must be ≥ 2 chars; shorter returns `{ results: [] }`.

**Behaviour:**
1. Reads `q`. If empty / too short → empty results.
2. Reads `ISBNDB_API_KEY` from env. If missing → `500 { error: "Search is not configured" }`.
3. Calls `${ISBNDB_BASE}/books/<encoded-q>?page=1&pageSize=20&shouldMatchAll=0` with 8s timeout.
4. Maps results to `SearchResult[]` (isbn13, title, authors, coverUrl, pubYear, publisher, pages, synopsis).
5. Cleans titles by stripping trailing `: a novel` / `(a novel)` suffixes.
6. On any error → empty results (search failures don't surface as 5xx).

**Env vars:** `ISBNDB_API_KEY`

**Notes:**
- This endpoint **does not write to the local DB** — it's a stateless search proxy. Database caching happens during *import* (see below) and during *book add* (via `auth callback after add`, when authenticated routes write to `books`/`book_authors`).
- Cover URL fallback: if ISBNdb returns no `image`, falls back to `https://images.isbndb.com/covers/<isbn>.jpg`.

---

### `GET /api/library` and `GET /api/library/isbns`

**Source:** `src/app/api/library/route.ts` and `src/app/api/library/isbns/route.ts`
**Auth:** required (`auth.getUser()` → 401 if missing)
**Caller:** import flow, library page (TBD — both endpoints are duplicates today)

> ⚠️ **The two route files are byte-identical duplicates.** Treat them as one. When editing one, edit both — until the dup is consolidated. See [Gotcha #1 in CLAUDE.md](../CLAUDE.md#-known-issues--gotchas).

**Request modes:**
```
GET /api/library            → { isbns: ["...", "..."] }
GET /api/library?details=1  → { books: [{ ...full meta, reads: [...] }, ...] }
```

**Behaviour:**

*Bare list mode:*
- Selects `isbn13` from `user_books` for the current user. Returns just the ISBN array.

*Details mode (`?details=1`):*
1. Selects from the `user_books_expanded` view: `isbn13, title, first_author_name, cover_url, status, ownership, visibility, rating, review, started_at, finished_at`.
2. Selects from `user_book_reads` for the current user, ordered by `read_number`.
3. Groups reads by `isbn13` and attaches to each book (`books[i].reads = [...]`).
4. Returns `{ books: [...] }`.

The reads-attached shape is consumed during CSV import to detect re-reads when matching imported rows against existing library entries.

---

### `POST /api/import/batch-meta` — DB-only batch lookup

**Source:** `src/app/api/import/batch-meta/route.ts`
**Auth:** required
**Caller:** `src/app/(protected)/import/page.tsx` (initial pass)

**Request:**
```json
{ "isbns": ["9780...", "9781...", ...] }
```
Max 500 ISBNs per request.

**Behaviour:**
1. Auth check.
2. Single DB query: `select isbn13, title, image, publisher, date_published, pages, synopsis from books where isbn13 in (...) and title is not null`. Books with null titles are treated as not found (incomplete metadata).
3. Single DB query for authors: `select isbn13, ord, authors(name) from book_authors where isbn13 in (...) order by ord`. Groups by isbn13.
4. Splits the input list into:
   - `found: BookMeta[]` — every ISBN with a complete row in `books`
   - `notFound: string[]` — every ISBN missing or with null title
5. Returns `{ found, notFound }`.

**Why two queries instead of a join?** Authors come through a many-to-many (`book_authors` → `authors`); separate queries are simpler and let Supabase's PostgREST handle each cleanly.

**Why DB-only?** Batch is the *fast path* — the import flow runs this first to surface known books instantly, then falls back to the streaming endpoint for `notFound` only.

---

### `POST /api/import/stream-meta` — NDJSON streaming with ISBNdb fallback

**Source:** `src/app/api/import/stream-meta/route.ts`
**Auth:** required
**Caller:** `src/app/(protected)/import/page.tsx` (fallback for the not-found set)

**Request:**
```json
{ "isbns": ["9780...", ...] }
```
Max 500 ISBNs per request.

**Response:** `Content-Type: application/x-ndjson`, `Transfer-Encoding: chunked`. One JSON object per line:
```
{"type":"progress","isbn":"...","result":{...}|null,"index":1,"total":N}
{"type":"progress",...}
...
{"type":"done","found":[...],"notFound":[...]}
```

The client reads chunks as they arrive and updates a per-ISBN status indicator in real time.

**Behaviour per ISBN:**
1. `lookupIsbn(isbn, supabase)` (in `src/app/api/import/shared.ts`):
   1. Check the local DB (`books` + `book_authors`). If `title` is set, return the cached row.
   2. Check `book_lookup_failures`. If a recent 404 is cached and `retry_after > now()`, skip ISBNdb (return null).
   3. Call `${ISBNDB_BASE}/book/<isbn>` with 4s timeout.
   4. On success:
      - Upsert into `books` (`onConflict: "isbn13", ignoreDuplicates: true`).
      - For each author, call the `upsert_author_and_link(isbn13_in, author_name_in, sort_name_in, ord_in)` RPC.
      - Delete any cached failure row.
      - Return the `BookMeta`.
   5. On failure:
      - Upsert into `book_lookup_failures` with `failed_at = now()` and `retry_after = now() + 30 days`.
      - Return null.
2. Append `{ type: "progress", isbn, result, index, total }` to the stream.
3. After all ISBNs processed, append `{ type: "done", found, notFound }` and close the stream.

**Env vars:** `ISBNDB_API_KEY` (else nothing falls back beyond the local DB)

**Why streaming?** The user is typically importing 50–500 books. A single 30-second blocking response is a worse UX than seeing a live progress bar update per ISBN. The streaming response also keeps connection-idle timeouts honest.

---

## ISBNdb integration

### Endpoints used

| Path | Caller | Purpose |
|---|---|---|
| `GET /books/<query>?page=1&pageSize=20&shouldMatchAll=0` | `api/search` | Free-text search |
| `GET /book/<isbn>` | `api/import/stream-meta` (via `lookupIsbn`) | Per-ISBN lookup |

**Base URL:** `https://api2.isbndb.com`
**Auth header:** Both `Authorization: <key>` and `x-api-key: <key>` are sent (ISBNdb accepts either, depending on plan tier).
**Timeouts:** 8s for search, 4s for per-ISBN lookup.
**Rate limits:** Plan-dependent. The 30-day 404 cache (`book_lookup_failures`) is the main backstop — never re-querying a known-bad ISBN within 30 days drastically reduces wasted calls.

### Local DB cache

Two tables back the cache:

- `books` — full metadata, indexed by `isbn13`. Owned by the iOS app and shared.
- `book_lookup_failures` — `{ isbn13, failed_at, retry_after }`. ISBNs that returned no metadata get a 30-day cooldown.

Cover URL strategy: ISBNdb sometimes returns an empty `image` field; in that case we fall back to `https://images.isbndb.com/covers/<isbn>.jpg`. Both hosts are whitelisted in `next.config.ts` for `next/image`.

### Author handling

Books and authors are linked through `book_authors (isbn13, author_id, ord)` and an `authors (id, name, sort_name)` table. The `upsert_author_and_link` RPC handles the upsert + link in one call (defined in the iOS repo's migrations). Always use the RPC — don't write directly to `book_authors`.

---

## Cloudflare Turnstile (waitlist captcha)

| File | Role |
|---|---|
| `src/app/page.tsx` | Loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` via `next/script` |
| `src/app/signup-form.tsx` | Renders the Turnstile widget (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`), captures the token, posts to `/api/signup` |
| `src/app/api/signup/route.ts` | Verifies the token with `TURNSTILE_SECRET_KEY` |

Turnstile is only used by the waitlist signup. Auth signup uses Supabase's own throttling.

---

## Required env vars

| Var | Where it's used | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase clients | Everything |
| `ISBNDB_API_KEY` | `api/search`, `api/import/stream-meta` | Search + ISBNdb fallback |
| `SUPABASE_URL` | `api/signup` | Waitlist insert |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/signup` | Waitlist insert (bypasses RLS) |
| `TURNSTILE_SECRET_KEY` | `api/signup` | Waitlist captcha verify |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `signup-form.tsx` | Waitlist captcha widget |

`.env.local.example` lists the user-facing minimum (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ISBNDB_API_KEY`). The waitlist + captcha vars are production-only; local dev typically doesn't exercise `/api/signup`.

---

## Patterns to follow

### Auth-required handler

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  // ... user-scoped work
  return NextResponse.json({ success: true });
}
```

### Error shape

Always return `{ error: "<short string>" }` for non-2xx responses. Use specific status codes (`400` bad input, `401` unauth, `403` forbidden, `404` not found, `409` conflict, `500` server error). Don't leak internal error messages — log them server-side and return a stable string.

### Logging

`console.error("[<endpoint>] <message>:", error)` is the convention (see `[batch-meta]`, `[stream-meta]`, `[import/isbndb]` prefixes in existing code). Logs go to Netlify's function logs.

### Streaming

Use `ReadableStream` + `TextEncoder` for NDJSON / SSE. See `api/import/stream-meta/route.ts` for the canonical pattern. Always emit a final `{ type: "done", ... }` event so clients know to stop reading.

---

## Gotchas

1. **Service-role key is server-only.** It bypasses RLS — never expose it to the browser. The only place it's used is `api/signup`.
2. **`api/library` and `api/library/isbns` are duplicates.** Edit both until consolidated.
3. **`api/signup` is the marketing waitlist, not auth.** Mixing them up will leak into the wrong table (`signups` vs `auth.users`).
4. **`api/search` returns empty arrays on errors.** This is intentional UX — search failures shouldn't break the UI — but be aware when debugging "nothing's coming back".
5. **`stream-meta` writes to the DB during the lookup.** The endpoint is not idempotent in a "side-effect-free" sense — every call that hits ISBNdb caches the result. This is desired (warms the cache for everyone) but worth knowing.
6. **`next/image` only allows whitelisted remote hosts** — see `next.config.ts`. New cover hosts (e.g. Open Library) need adding there before they'll render.
7. **Turnstile site key is `NEXT_PUBLIC_*`, secret is not.** Don't swap them in env config.
8. **API routes are not in `PROTECTED_ROUTES`** — middleware doesn't gate them. Each handler must enforce auth itself with `auth.getUser()`.

---

## Cross-references

- **Shared search/metadata pipeline (iOS):** `inprose-v2/docs/SEARCH_AND_METADATA.md`
- **`upsert_author_and_link` RPC:** `inprose-v2/docs/DATABASE_SCHEMA.md`
- **`books`, `book_authors`, `authors`, `user_books`, `user_book_reads`, `book_lookup_failures` tables:** `inprose-v2/docs/DATABASE_SCHEMA.md`
- **Edge functions / triggers (none owned by site):** `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md`
