# Features

A navigation aid: every user-facing surface on `in-prose-site`, with file pointers and the data sources behind each.

> This is intentionally shallow — it's a map, not a design doc. For depth on backend behaviour (DB schema, RPCs, RLS), follow the cross-references to `inprose-v2/docs/`.
>
> **Companion docs:**
> - `ARCHITECTURE.md` — App Router, RSC, Tailwind v4
> - `AUTHENTICATION.md` — auth gate, Supabase clients
> - `API_AND_INTEGRATIONS.md` — server endpoints

---

## Marketing home & waitlist

| | |
|---|---|
| **Routes** | `/` (when not logged in, or when logged in and on the marketing tree) |
| **Files** | `src/app/page.tsx` (server, fetches latest news), `src/app/home-switch.tsx` (client, picks marketing vs `<Dashboard />`), `src/app/signup-form.tsx` (waitlist form) |
| **Components** | `nav-bar.tsx` (top nav), `signup-form.tsx` |
| **Data** | `news_posts` (latest 3 published) for the "Latest news" carousel; waitlist writes to the `signups` table via `/api/signup` |
| **Notes** | Cloudflare Turnstile gates the waitlist form. Loaded via `next/script` with `strategy="afterInteractive"`. |

---

## Authed dashboard

| | |
|---|---|
| **Routes** | `/` when logged in (rendered via `home-switch.tsx`) |
| **Files** | `src/components/dashboard.tsx` (≈865 lines, single client component) |
| **Data** | `user_books_expanded`, `reading_targets`, `habits`, target/habit progress |
| **Notes** | Surfaces TBR + targets + habits. Heavy lift; consider splitting if it grows further. |

---

## Library

| | |
|---|---|
| **Routes** | `/library`, `/library/[isbn]` (protected) |
| **Files** | `src/app/(protected)/library/page.tsx`, `src/app/(protected)/library/[isbn]/page.tsx` |
| **Components** | `book-card.tsx`, `book-edit-wrapper.tsx` |
| **Data** | `user_books_expanded` view, `user_books`, `user_book_reads` |
| **Filters** | Status (`all`, `to_read`, `reading`, `finished`, `dnf`); sort by `created_at`, `title`, `first_author_sort_name`, `rating`, `finished_at` |
| **iOS counterpart** | `inprose-v2/docs/LIBRARY_SYSTEM.md` |

The detail page (`[isbn]`) handles read/edit of status, rating, review, visibility, started/finished dates. Re-read tracking lives in `user_book_reads`.

---

## Search

| | |
|---|---|
| **Routes** | `/search` (protected) |
| **Files** | `src/app/(protected)/search/page.tsx` |
| **API** | `GET /api/search` (proxies ISBNdb) |
| **Data flow** | User types → `/api/search?q=...` → ISBNdb → render `SearchResult[]`; on add, write to `books` + `book_authors` (via `upsert_author_and_link` RPC) and `user_books`. |
| **iOS counterpart** | `inprose-v2/docs/SEARCH_AND_METADATA.md` |

---

## CSV import

| | |
|---|---|
| **Routes** | `/import` (protected) |
| **Files** | `src/app/(protected)/import/page.tsx` |
| **API** | `POST /api/import/batch-meta` (DB-only fast path), `POST /api/import/stream-meta` (NDJSON streaming with ISBNdb fallback), `GET /api/library?details=1` (existing library + reads, used to detect dupes/re-reads) |
| **Library** | `papaparse` for CSV parsing |
| **Data** | Reads `user_books_expanded` + `user_book_reads` for current library; writes to `books`, `book_authors`, `user_books` |
| **Two-phase pattern** | Step 1: `batch-meta` resolves everything we already have in `books`. Step 2: stream the not-found set through `stream-meta` (which falls back to ISBNdb and updates the DB cache + `book_lookup_failures`). |

Max 500 ISBNs per request — both endpoints enforce this.

---

## Friends, feed, find

| | |
|---|---|
| **Routes** | `/friends` (tabbed: Feed / Friends / Find), `/friends/[friendId]`, `/feed` (protected) |
| **Files** | `src/app/(protected)/friends/page.tsx` (≈1500 lines), `src/app/(protected)/friends/[friendId]/page.tsx`, `src/app/(protected)/feed/page.tsx` |
| **Components** | `user-avatar.tsx` |
| **Data** | `friendships` (bidirectional), `get_friends_activity_feed` RPC, `activity_comments`, `post_reactions` |
| **iOS counterpart** | `inprose-v2/docs/SOCIAL_FEATURES.md`, `inprose-v2/docs/POSTS.md` |

---

## Stats

| | |
|---|---|
| **Routes** | `/stats` (protected) |
| **Files** | `src/app/(protected)/stats/page.tsx` |
| **Components** | `targets/`, `habits/` |
| **Helpers** | `src/lib/targets.ts`, `src/lib/habits.ts` |
| **Data** | `reading_targets` + progress RPCs, `habits` + streak RPCs, `user_books` for finish counts |
| **iOS counterpart** | `inprose-v2/docs/READING_TARGETS.md` |

---

## Reading targets

| | |
|---|---|
| **Files** | `src/lib/targets.ts` (math: progress, history, rolling-window starts, calendar period math, period labels), `src/components/targets/{target-form.tsx, target-card.tsx, targets-tab.tsx}` |
| **Data** | `reading_targets` table; types of target: deadline + rolling |
| **iOS counterpart** | `inprose-v2/docs/READING_TARGETS.md` |

---

## Habits

| | |
|---|---|
| **Files** | `src/lib/habits.ts`, `src/components/habits/{habit-card, habit-form, habits-tab, habit-day-box, habit-day-view, habit-week-view, habit-month-view, weekly-habit-week-view, weekly-habit-month-view}.tsx` |
| **Data** | `habits` table, `habit_logs`, streak RPCs (`get_habit_streaks`) |
| **Notes** | Daily and weekly habit cadences are rendered through different month/week views. |

---

## Enrichment (book moods, vibes, multi-select surveys)

| | |
|---|---|
| **Files** | `src/components/enrichment/{enrichment-sheet, enrichment-answers-view}.tsx`, `src/lib/enrichment/{client.ts, types.ts, use-enrichment-trigger.tsx}` |
| **Data** | Survey templates + question-target tables (owned by iOS repo) |
| **Trigger pattern** | `useEnrichmentTrigger` hook decides when to surface a survey; sheet renders; answers post via the enrichment client |
| **iOS counterpart** | `inprose-v2/docs/ENRICHMENT.md` |

---

## News / blog (public)

| | |
|---|---|
| **Routes** | `/news` (listing with type filter), `/news/[slug]` (post detail) |
| **Files** | `src/app/news/page.tsx`, `src/app/news/[slug]/page.tsx`, `src/components/news/{news-card, book-list-page, book-spotlight-page, image-gallery}.tsx`, `src/lib/news-book-meta.ts` |
| **Data** | `news_posts` (status='published'); some posts reference book groups — `news-book-meta.ts` resolves book metadata for spotlight/list posts |
| **Post types** | `featured_review`, `release_notes_app`, `release_notes_website`, `article`, `announcement`, plus structured `book_list` and `book_spotlight` |
| **SEO** | `metadata` exports on each page; included in `sitemap.ts` |

---

## News admin editor

| | |
|---|---|
| **Routes** | `/admin/news`, `/admin/news/new`, `/admin/news/[id]/edit` |
| **Files** | `src/app/admin/layout.tsx` (server-side `is_admin` check), `src/app/admin/news/page.tsx`, `src/app/admin/news/new/page.tsx`, `src/app/admin/news/[id]/edit/page.tsx`, `src/components/news/news-post-form.tsx` |
| **Auth** | Double-gated: middleware (`PROTECTED_ROUTES` + `ADMIN_ROUTES` checks `is_admin`) **and** `admin/layout.tsx` redirects if `is_admin` is false |
| **Data** | `news_posts`, `news_post_books` (book_list/spotlight), Supabase storage for image uploads |

---

## Public profile

| | |
|---|---|
| **Routes** | `/u/[username]`, also accessible via `/@[username]` (rewrite in `netlify.toml`) |
| **Files** | `src/app/u/[username]/page.tsx`, `src/app/u/[username]/loading.tsx` |
| **Caching** | `export const revalidate = 60` — ISR with 60-second staleness |
| **Data** | `profiles` (public fields), `user_books_expanded` filtered to public visibility, `user_favourites` |
| **Auth** | None — relies on RLS allowing anon reads of public rows |

---

## Share link

| | |
|---|---|
| **Routes** | `/s/[code]` |
| **Files** | `src/app/s/[code]/page.tsx` |
| **Data** | `share_links` (or equivalent table — see iOS `MISC_FEATURES.md`); resolves to a public profile, book, or list view |
| **iOS counterpart** | `inprose-v2/docs/MISC_FEATURES.md` |

---

## Public book page

| | |
|---|---|
| **Routes** | `/book/[isbn]` |
| **Files** | `src/app/book/[isbn]/page.tsx` |
| **Data** | `books`, `book_authors`, public reviews from `user_books` |
| **Auth** | None — public, SEO-indexed |

---

## Auth pages

Covered in detail in `AUTHENTICATION.md`:

| Route | File | Notes |
|---|---|---|
| `/login` | `src/app/login/page.tsx` | Email/password + Apple/Google OAuth |
| `/signup` | `src/app/signup/page.tsx` | Email/password + Apple/Google OAuth |
| `/signup/profile` | `src/app/signup/profile/page.tsx` | Forced after signup if `profiles.username` is null |
| `/signup-success` | `src/app/signup-success/page.tsx` | Static "check your email" |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth code exchange |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | Email OTP (signup, recovery, email change) |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | `resetPasswordForEmail` |
| `/reset-password` | `src/app/reset-password/page.tsx` | New password form (post-recovery session) |
| `/confirmed` | `src/app/confirmed/page.tsx` | Static success after email confirmation |

---

## Account & settings

| | |
|---|---|
| **Routes** | `/account`, `/settings`, `/settings/profile`, `/contact` (protected) |
| **Files** | `src/app/(protected)/{account, settings, settings/profile, contact}/page.tsx` |
| **Data** | `profiles` (display name, username, avatar, bio, visibility defaults) |

---

## Static / utility pages

| Route | Purpose |
|---|---|
| `/privacy` | Privacy policy (static) |
| `/terms` | Terms of use (static) |
| `/offline` | PWA offline fallback |
| `/robots.txt` | Generated by `src/app/robots.ts` |
| `/sitemap.xml` | Generated by `src/app/sitemap.ts` |

---

## App-wide chrome / cross-cutting concerns

| | |
|---|---|
| **Cookie consent** | `src/components/cookie-consent.tsx` — rendered in root layout |
| **PWA install banner** | `src/components/pwa-install-banner.tsx` — rendered in root layout |
| **Service worker** | `src/app/sw.ts` (Serwist) — `/offline` fallback, runtime caching |
| **Auth context** | `src/components/auth-provider.tsx` — wraps everything |
| **App shell** | `src/components/app-shell.tsx` — sidebar / mobile bottom nav (renders only when authed) |
| **Error boundaries** | `src/app/error.tsx` (route-level), `src/app/global-error.tsx` (root), `src/app/not-found.tsx` (404) |

---

## Data-source quick reference

| Need data about... | Source |
|---|---|
| Books | `books`, `book_authors`, `authors` |
| User libraries | `user_books`, `user_books_expanded` (view), `user_book_reads` |
| Friends | `friendships` (bidirectional) + `get_friends_activity_feed` RPC |
| Activity feed | `get_friends_activity_feed` / `get_activity_feed` RPCs |
| Posts / comments / reactions | `posts`, `activity_comments`, `post_reactions` |
| Reading targets | `reading_targets` + progress RPCs |
| Habits | `habits`, `habit_logs` + streak RPCs |
| Enrichment | survey template + targeting tables (iOS-owned) |
| News | `news_posts`, `news_post_books` |
| Public profile | `profiles` + filtered `user_books_expanded` + `user_favourites` |
| Waitlist | `signups` (write only, via service-role key) |

For the authoritative schema, RPCs, and RLS policies, see **`inprose-v2/docs/DATABASE_SCHEMA.md`**.

---

## Cross-references

| iOS doc | Relevant when working on... |
|---|---|
| `inprose-v2/docs/LIBRARY_SYSTEM.md` | Library, book detail, ratings, reviews, favourites |
| `inprose-v2/docs/SEARCH_AND_METADATA.md` | Search, ISBNdb, metadata caching |
| `inprose-v2/docs/SOCIAL_FEATURES.md` | Friends, activity feed, blocking |
| `inprose-v2/docs/POSTS.md` | Posts, comments, reactions, mentions |
| `inprose-v2/docs/READING_TARGETS.md` | Reading targets, habits, streaks |
| `inprose-v2/docs/ENRICHMENT.md` | Enrichment / surveys |
| `inprose-v2/docs/STACKS.md` | Curated book lists |
| `inprose-v2/docs/MISC_FEATURES.md` | Share links, account deletion, edition picker |
| `inprose-v2/docs/DATABASE_SCHEMA.md` | Any DB table, view, RPC, enum, RLS policy |
| `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md` | Edge functions, triggers, RLS security model |
