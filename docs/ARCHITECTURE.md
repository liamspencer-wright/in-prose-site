# Architecture

How the in-prose-site Next.js codebase fits together: routing, server vs client components, Tailwind v4, Serwist PWA, and styling conventions.

> **Companion docs:**
> - `AUTHENTICATION.md` — middleware, auth flows, Supabase clients
> - `API_AND_INTEGRATIONS.md` — API route handlers, ISBNdb, Netlify
> - `FEATURES.md` — feature-area file map

---

## App Router layout

All UI lives under `src/app/`. The router uses two route groups and a flat `api/` tree:

```
src/app/
├── layout.tsx              # Root: font, providers, AppShell, CookieConsent, PwaInstallBanner
├── page.tsx                # Marketing home (server) → swaps to <Dashboard /> if authed
├── home-switch.tsx         # Client: picks marketing vs dashboard
├── globals.css             # Tailwind v4 @theme tokens
├── sw.ts                   # Serwist service worker source
├── error.tsx, global-error.tsx, not-found.tsx
├── robots.ts, sitemap.ts
│
├── (protected)/            # Logged-in surfaces — gated by middleware.ts
│   ├── layout.tsx          # Pass-through (auth gating is in middleware)
│   ├── library/, library/[isbn]/
│   ├── search/
│   ├── friends/, friends/[friendId]/
│   ├── feed/
│   ├── stats/
│   ├── import/
│   ├── account/, settings/, settings/profile/, contact/
│
├── admin/                  # Admin (middleware + layout server check)
│   ├── layout.tsx          # Verifies profiles.is_admin
│   └── news/, news/new/, news/[id]/edit/
│
├── api/                    # App Router route handlers — see API_AND_INTEGRATIONS.md
│
├── auth/callback/, auth/confirm/    # Auth code & OTP exchange — see AUTHENTICATION.md
├── login/, signup/, signup/profile/, signup-success/, confirmed/
├── forgot-password/, reset-password/
│
├── news/, news/[slug]/     # Public news/blog
├── book/[isbn]/            # Public book detail page
├── u/[username]/           # Public profile (revalidate: 60)
├── s/[code]/               # Share link
└── privacy/, terms/, offline/
```

### Route groups

- **`(protected)/`** — folder name in parens does not appear in the URL. It groups logged-in routes for organisation only. **Auth gating is done in `middleware.ts`, not in `(protected)/layout.tsx`.** The layout is a passthrough. (See [Gotcha #3 in CLAUDE.md](../CLAUDE.md#-known-issues--gotchas).)
- **`admin/`** — not a route group; the URL is `/admin/...`. Gated twice: first by middleware (`PROTECTED_ROUTES` + `ADMIN_ROUTES`), then by `admin/layout.tsx` doing `redirect("/")` if `profiles.is_admin` is false.

### Dynamic segments

Convention is `[isbn]`, `[slug]`, `[id]`, `[code]`, `[username]`, `[friendId]`. All are async-params in Next 15:

```tsx
type Props = { params: Promise<{ username: string }> };

export default async function Page({ params }: Props) {
  const { username } = await params;
  // ...
}
```

### Special files

| File | Purpose |
|---|---|
| `layout.tsx` | Wraps a route subtree — composes upward |
| `page.tsx` | Renders a route |
| `error.tsx` / `global-error.tsx` | Error boundaries (`global-error` is the root-most) |
| `not-found.tsx` | 404 page |
| `loading.tsx` | Streaming loading UI (used by `u/[username]/loading.tsx`) |
| `robots.ts` | `/robots.txt` generator |
| `sitemap.ts` | `/sitemap.xml` generator |
| `sw.ts` | Serwist service worker (compiled to `public/sw.js`) |

### Path alias

`tsconfig.json` defines `@/*` → `./src/*`. Always use `@/components/...`, `@/lib/...` — never relative paths like `../../components`.

---

## Server vs client components

Default to **Server Components**. Add `"use client"` only when you need:
- React state / effects (`useState`, `useEffect`, `useMemo`, `useRef`)
- Browser APIs (`window`, `localStorage`, etc.)
- Event handlers
- React context (e.g. `useAuth()`)
- Subscriptions (e.g. `supabase.auth.onAuthStateChange`)

### Server data fetch (default)

```tsx
// src/app/some-route/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_books_expanded")
    .select("isbn13, title, first_author_name, cover_url")
    .order("created_at", { ascending: false });

  return <BookList books={data ?? []} />;
}
```

- `createClient` is async (it calls `await cookies()`)
- RLS still applies — middleware refreshes the session cookie before the request reaches the page
- Use `export const revalidate = 60` (or similar) for ISR caching where stale data is acceptable

### Client data fetch

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

export function BookList() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_books_expanded")
      .select("isbn13, title")
      .then(({ data }) => setBooks(data ?? []));
  }, [user, supabase]);

  return <ul>{books.map(b => <li key={b.isbn13}>{b.title}</li>)}</ul>;
}
```

### Hybrid (server page renders client subtree)

The marketing home is the canonical example:

- `src/app/page.tsx` — server, fetches `news_posts` for the marketing page
- `src/app/home-switch.tsx` — client, calls `useAuth()`, decides whether to render the marketing tree (passed as a prop) or the `<Dashboard />` (also a client component)

This pattern lets server data ride along with the marketing render while still allowing a client-side branch for the authed experience.

### When to use server actions vs `route.ts`

| Use server action | Use `route.ts` |
|---|---|
| Mutation triggered from one page's form | Endpoint called from multiple places |
| Trivial single-DB-write | Needs streaming (NDJSON, SSE) |
| Tightly coupled to the page | Used by client code via `fetch()` |

Today the codebase favours `route.ts` (see `src/app/api/`). Server actions are a valid choice for new work — pick whichever keeps the code closer to its caller.

---

## Tailwind CSS v4 — config-less, CSS-first

There is **no `tailwind.config.js`**. All theme tokens live in `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-accent: #ff7f32;
  --color-accent-hover: #e6712d;
  --color-bg-light: #fbf1ec;
  --color-bg-medium: #f4dcc2;
  --color-text-primary: #1b1b1b;
  --color-text-muted: rgba(27, 27, 27, 0.65);
  --color-text-subtle: rgba(27, 27, 27, 0.35);
  --color-error: #c0392b;
  --color-border: rgba(27, 27, 27, 0.1);
  --color-border-subtle: rgba(27, 27, 27, 0.06);
  --color-accent-blue: #203150;
  --color-text-on-accent: #F8EEE1;

  --font-serif: "Crimson Text", serif;

  --radius-card: 16px;
  --radius-input: 10px;
}
```

### Tokens → utilities

| Token | Utility |
|---|---|
| `--color-accent` | `bg-accent`, `text-accent`, `border-accent`, `accent/15` (opacity) |
| `--color-bg-light` | `bg-bg-light`, `text-bg-light` |
| `--color-text-muted` | `text-text-muted` |
| `--font-serif` | `font-serif` |
| `--radius-card` | `rounded-(--radius-card)` (arbitrary CSS-var syntax) |

### Adding a new token

1. Add `--color-foo: #...;` (or `--font-foo`, `--radius-foo`) to the `@theme` block in `src/app/globals.css`
2. Use `bg-foo`, `text-foo`, etc. in markup immediately — Tailwind v4 picks it up

### Key v4 differences from v3

- **No JS config file.** Don't create one — it will be ignored or conflict.
- **`@import "tailwindcss"` replaces `@tailwind base/components/utilities`.**
- **PostCSS plugin is `@tailwindcss/postcss`** (`postcss.config.mjs`).
- **CSS-var arbitrary utilities:** `rounded-(--radius-card)`, `bg-(--color-foo)`, etc. — paren syntax, not bracket.

### Light-mode only

The site is currently light-mode only — no dark-mode tokens are defined and no `prefers-color-scheme` media query is wired up. Don't add dark-mode utilities (`dark:bg-...`) — they will not render usefully.

---

## Fonts

`src/app/layout.tsx` loads Crimson Text via `next/font/google`:

```tsx
const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});
```

The `--font-crimson` variable is exposed on `<body>` and the `--font-serif` theme token references `"Crimson Text"`. Use `font-serif` to apply.

For new fonts, follow the same pattern (`next/font/google` → CSS variable → reference in `@theme`).

---

## Component organisation

```
src/components/
├── auth-provider.tsx       # AuthContext + useAuth hook
├── app-shell.tsx           # Sidebar (sm+) + mobile bottom nav
├── nav-bar.tsx             # Marketing top nav
├── dashboard.tsx           # Authed home (TBR + targets + habits) — large client component
├── book-card.tsx, book-edit-wrapper.tsx, user-avatar.tsx
├── cookie-consent.tsx, pwa-install-banner.tsx
├── enrichment/             # Book enrichment sheet + answers view
├── habits/                 # Habit cards + day/week/month views
├── news/                   # News card + post form + book-list/spotlight pages + image gallery
└── targets/                # Reading-target form, card, tab
```

### Conventions

- **Top-level files** — small reusable components used app-wide
- **Subdirectories** — feature-grouped components (only used by their feature)
- **One component per file** unless the inner component is a private helper for a single export
- **Filenames:** kebab-case. Default export when the component matches the filename; named export otherwise

---

## Service worker / PWA (Serwist)

PWA support is provided by `@serwist/next` 9.5.

### Pieces

| File | Role |
|---|---|
| `next.config.ts` | Wraps `nextConfig` in `withSerwist({ swSrc, swDest })` |
| `src/app/sw.ts` | Service worker source — precache, runtime cache, `/offline` fallback |
| `public/sw.js` | Generated output — never edit by hand |
| `public/site.webmanifest` | PWA manifest |
| `src/components/pwa-install-banner.tsx` | Install prompt UI |
| `src/app/offline/page.tsx` | Fallback page when navigation request fails offline |
| `netlify.toml` | Serves `sw.js` with `Service-Worker-Allowed: /` and `Cache-Control: no-cache` |
| `tsconfig.json` | Excludes `src/app/sw.ts` from the main TS build (Serwist compiles it) |

### Behaviour

`src/app/sw.ts` uses Serwist's `defaultCache` runtime caching. On navigation requests, an offline fallback to `/offline` is served via `fallbacks.entries`. `skipWaiting: true` and `clientsClaim: true` mean updated workers activate immediately on the next page load.

To force a full re-bake, bump the cache versioning in Serwist or invalidate `public/sw.js` via Netlify.

---

## Routing & navigation

### Logged-in chrome (sidebar / bottom nav)

`AppShell` (in `src/components/app-shell.tsx`) is wrapped in the root layout and reads `useAuth()`. When `user` is non-null:

- **`sm+`** — sidebar with collapsible labels (`w-16` collapsed, `w-52` expanded), nav items: Home, Search, Library, Friends, Stats, Account; footer: Contact, Settings, Log out
- **`< sm`** — fixed bottom nav (`safe-area-inset-bottom` for iOS Safari)
- **Active state:** `pathname.startsWith(item.href)` (with `/` exact-matched)

When `user` is null, `AppShell` returns `<main>{children}</main>` only — no chrome. This is what the marketing home, login, and signup pages render with.

### Marketing top nav

`src/components/nav-bar.tsx` provides the marketing top bar. Used in `page.tsx` and `news/page.tsx` (and other public pages). Distinct from `AppShell`'s sidebar.

### Vanity URLs

`netlify.toml` rewrites:
- `/@username` → `/u/username` (200, in-place)
- `/@username/*` → `/u/username/*`

Don't add a separate `@/[username]/` route — the rewrite handles it.

---

## Image handling

`next/image` requires whitelisted remote hosts in `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "oqxodsatbzdkewvbwtrt.supabase.co", pathname: "/storage/v1/object/public/**" },
    { protocol: "https", hostname: "images.isbndb.com" },
    { protocol: "https", hostname: "covers.openlibrary.org" },
  ],
}
```

To pull images from a new host, add it here.

---

## Layout & styling rules

1. **Tailwind utilities only** for layout, spacing, and colour. Inline `style={...}` is reserved for dynamic values that can't be expressed in classes (e.g. `paddingBottom: env(safe-area-inset-bottom)` in `app-shell.tsx`).
2. **Theme tokens, not hex.** Use `bg-accent`, `text-text-muted`, etc. — never `bg-[#ff7f32]`.
3. **Mobile-first.** Default styles target mobile; `sm:`, `md:`, `lg:` opt into wider screens. Many pages use `max-sm:` for mobile-specific overrides.
4. **No dark mode utilities.** Site is light-mode only.
5. **Accessibility:**
   - Always include `aria-label` on icon-only buttons (`<button aria-label="Log out">`)
   - Skip-to-main-content link is in `layout.tsx` (`#main-content`)
   - Use `<nav aria-label="...">` for distinct navs
   - Use semantic HTML (`<section>`, `<article>`, `<nav>`, `<main>`, `<aside>`)

---

## Build & runtime

- **Dev:** `npm run dev` (Turbopack on `:3000`)
- **Build:** `npm run build` (also runs Serwist to generate `public/sw.js`)
- **Start:** `npm start` (serves the production build)
- **Lint:** `npm run lint` (`next/core-web-vitals` + `next/typescript`)

### Netlify build

`netlify.toml`:
- `[build] command = "npm run build"`, `publish = ".next"`, `NODE_VERSION = "20"`
- `@netlify/plugin-nextjs` adapts the App Router output for Netlify
- Branch deploys disabled (`exit 1`); only `main` and PR previews build

### CSP / security headers

`netlify.toml` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off), HSTS, and a `Content-Security-Policy-Report-Only` covering script/style/img/font/connect sources. CSP is currently report-only — promote to enforced once violations are clean.

---

## Cross-references

- **Backend / Supabase schema, RPCs, RLS:** `inprose-v2/docs/DATABASE_SCHEMA.md`
- **Edge functions, triggers, RLS security model:** `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md`
- **iOS architecture (for shared concepts):** `inprose-v2/docs/ARCHITECTURE.md`
