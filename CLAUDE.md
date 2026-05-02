# In Prose Site — Project Context for Claude Code

**Version:** 1.0
**Last Updated:** May 2026
**Project Type:** Next.js Web App (companion site to the In Prose iOS app)

---

> ## ⚠️ Critical: Keep Docs Current
>
> This codebase has feature-area docs in `docs/`. **When you change a feature, update its doc in the same PR.** See **[Documentation Maintenance](#-documentation-maintenance-required)** for the full mapping. Stale docs are worse than no docs — treat them as part of the code.

---

## 🎯 Project Overview

**In Prose Site** is the public-facing web app for In Prose at [inprose.co.uk](https://inprose.co.uk). It shares the same Supabase backend as the iOS app and provides a marketing surface, a logged-in web companion (library, search, friends, feed, stats), an admin news editor, public profiles (`/u/[username]`), share links (`/s/[code]`), and a public book detail page (`/book/[isbn]`).

**Core surfaces:**
- Marketing home + waitlist signup
- News / blog (admin-managed posts: featured reviews, release notes, articles, announcements)
- Logged-in dashboard mirroring iOS features (library, search, friends, feed, stats, import, account)
- Public profiles + share links + public book pages (SEO-indexed)
- Admin news editor (gated by `profiles.is_admin`)
- PWA support via Serwist

**Backend ownership:** All Supabase schema, RPCs, RLS policies, and edge functions live in the **iOS repo** (`inprose-v2`). This repo is a consumer.

---

## 🛠️ Tech Stack

### Web
- **Next.js 15.3** — App Router, Turbopack dev
- **React 19**
- **TypeScript 5.8** (strict)
- **Tailwind CSS 4.1** — config-less, CSS-first via `@theme` block in `src/app/globals.css`
- **Serwist 9.5** — PWA / service worker (`src/app/sw.ts` → `public/sw.js`)
- **Crimson Text** — serif font via `next/font/google`

### Backend client
- **`@supabase/ssr` 0.6** — three clients: browser, server (RSC/route handlers), middleware (edge)
- **`@supabase/supabase-js` 2.49** — base client

### Hosting / Infra
- **Netlify** — `main` auto-deploys to production; PR previews enabled; non-PR branch deploys disabled (build-minute conservation)
- **`@netlify/plugin-nextjs`** — Next.js adapter
- **Cloudflare Turnstile** — captcha for the marketing waitlist signup

### External APIs
- **ISBNdb** — book metadata (search + per-ISBN lookup)
- Local DB caches both successful lookups and 404s (`books`, `book_lookup_failures` tables)

### Other deps
- **`papaparse`** — CSV parsing for the library import flow

---

## 🏗️ Architecture & Patterns

### App Router structure

The app uses Next.js App Router with two route groups and a flat `api/` tree:

- **Public routes** — marketing home, news, public profiles, share links, public book pages, auth pages
- **`(protected)/` group** — logged-in surfaces; gated by `middleware.ts`
- **`admin/`** — admin-only news editor; double-gated (middleware + per-layout server check)
- **`api/`** — App Router route handlers (`route.ts`) for server-side work

### Auth model

Three Supabase clients, three contexts:

| Client | File | Used in |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` (`createBrowserClient`) | `'use client'` components |
| Server | `src/lib/supabase/server.ts` (`createServerClient` + `next/headers cookies`) | RSC, server actions, `route.ts` |
| Middleware | `src/lib/supabase/middleware.ts` (`updateSession`) | `middleware.ts` only |

**Middleware (`middleware.ts`)** runs on every request (matcher excludes static assets) and:
1. Refreshes the Supabase session cookie (essential — RSC reads only refreshed cookies)
2. Redirects unauthenticated requests to `/login?next=...&message=...` for protected routes
3. Forces authenticated users without a `profiles.username` to `/signup/profile`
4. Gates `/admin` on `profiles.is_admin`
5. Bounces logged-in users away from `/login`, `/signup`, `/forgot-password`

**Client-side auth context** lives in `src/components/auth-provider.tsx` — a React context backed by `supabase.auth.onAuthStateChange`. `AppShell` reads `user` from it to decide whether to render the sidebar / mobile bottom nav (logged-in chrome) or just the bare `<main>` (marketing / auth pages).

### Server vs client components

- **Default:** Server Components. Use `await createClient()` from `@/lib/supabase/server` and `await supabase.from(...)`.
- **`'use client'`:** Only when you need state, effects, browser APIs, or `onAuthStateChange`. Use `createClient()` from `@/lib/supabase/client`.
- **`route.ts`:** API endpoints — server only, use the server client.
- **Hybrid:** Server page can render a client subtree (e.g. home `page.tsx` is server; `home-switch.tsx` is client and decides whether to render `<Dashboard />` (client) or the marketing tree).

### Tailwind v4 — CSS-first config

There is no `tailwind.config.js`. All theme tokens live in `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-accent: #ff7f32;
  --color-bg-light: #fbf1ec;
  --color-bg-medium: #f4dcc2;
  --color-text-primary: #1b1b1b;
  --color-text-muted: rgba(27, 27, 27, 0.65);
  /* ... */
  --font-serif: "Crimson Text", serif;
  --radius-card: 16px;
  --radius-input: 10px;
}
```

This generates utilities like `bg-accent`, `text-text-muted`, `font-serif`, and arbitrary CSS-var utilities like `rounded-(--radius-card)`. **Always prefer the tokens over raw hex.**

### PWA (Serwist)

- `src/app/sw.ts` — service worker source (precache, runtime cache, `/offline` fallback)
- `public/sw.js` — generated, never edited by hand
- `public/site.webmanifest` — PWA manifest
- `src/components/pwa-install-banner.tsx` — install prompt

`tsconfig.json` excludes `src/app/sw.ts` from the main build; Serwist's webpack hook compiles it.

---

## 📁 Project Structure

```
in-prose-site/
├── middleware.ts                 # Edge middleware — calls updateSession()
├── next.config.ts                # withSerwist + remote image patterns
├── netlify.toml                  # Build, headers (CSP, HSTS), redirects (vanity @user)
├── tsconfig.json                 # @/* → ./src/*
├── postcss.config.mjs            # Tailwind v4 postcss plugin
├── eslint.config.mjs             # next/core-web-vitals + next/typescript
│
├── public/                       # Static assets
│   ├── icons/                    # Nav icons (home, library, friends, etc.)
│   ├── logo.png, og-image.png, favicon*, apple-touch-icon.png
│   ├── site.webmanifest, sw.js (generated)
│   └── .well-known/              # Apple universal-link assoc, etc.
│
├── src/
│   ├── app/                      # App Router
│   │   ├── layout.tsx            # Root: Crimson font, AuthProvider, AppShell, CookieConsent, PwaInstallBanner
│   │   ├── page.tsx              # Marketing home (server) → switches to Dashboard if authed
│   │   ├── home-switch.tsx       # Client component that picks marketing vs Dashboard
│   │   ├── signup-form.tsx       # Waitlist signup form (client)
│   │   ├── globals.css           # Tailwind v4 @theme tokens
│   │   ├── sw.ts                 # Serwist service worker
│   │   ├── error.tsx, global-error.tsx, not-found.tsx
│   │   ├── robots.ts, sitemap.ts
│   │   │
│   │   ├── (protected)/          # Logged-in surfaces (middleware-gated)
│   │   │   ├── layout.tsx        # Pass-through (gating done in middleware.ts)
│   │   │   ├── library/          # Library list + [isbn] detail + edit
│   │   │   ├── search/           # ISBN search → add to library
│   │   │   ├── friends/          # Friends/feed/find tabs + [friendId] profile
│   │   │   ├── feed/             # Activity feed
│   │   │   ├── stats/            # Reading stats / charts
│   │   │   ├── import/           # CSV import flow
│   │   │   ├── account/, settings/, settings/profile/, contact/
│   │   │
│   │   ├── admin/                # Admin (middleware + admin/layout.tsx server check)
│   │   │   ├── layout.tsx        # Verifies profiles.is_admin, else redirect
│   │   │   └── news/             # News post list + new + [id]/edit
│   │   │
│   │   ├── api/                  # Route handlers
│   │   │   ├── signup/route.ts          # Waitlist signup (Turnstile + service-role insert)
│   │   │   ├── search/route.ts          # ISBNdb search proxy
│   │   │   ├── library/route.ts         # User's books (basic ISBN list or full details)
│   │   │   ├── library/isbns/route.ts   # Same as above (duplicate — see Gotchas)
│   │   │   ├── import/shared.ts         # ISBNdb fetch + DB cache + 404 cache helper
│   │   │   ├── import/batch-meta/route.ts   # DB-only batch lookup (max 500)
│   │   │   └── import/stream-meta/route.ts  # NDJSON streaming with ISBNdb fallback
│   │   │
│   │   ├── auth/
│   │   │   ├── callback/route.ts # OAuth code exchange → /signup/profile or next
│   │   │   └── confirm/route.ts  # Email OTP verify (signup, recovery, email change)
│   │   │
│   │   ├── login/, signup/, signup/profile/, signup-success/, confirmed/
│   │   ├── forgot-password/, reset-password/
│   │   │
│   │   ├── news/                 # Public news listing + [slug] detail
│   │   ├── book/[isbn]/          # Public book page
│   │   ├── u/[username]/         # Public profile (revalidate: 60)
│   │   ├── s/[code]/             # Share link
│   │   ├── privacy/, terms/, offline/
│   │
│   ├── components/
│   │   ├── auth-provider.tsx     # React context wrapping supabase.auth.onAuthStateChange
│   │   ├── app-shell.tsx         # Sidebar (sm+) + mobile bottom nav (rendered only when authed)
│   │   ├── nav-bar.tsx           # Marketing top nav
│   │   ├── dashboard.tsx         # Authed home dashboard (TBR + targets + habits)
│   │   ├── book-card.tsx, book-edit-wrapper.tsx, user-avatar.tsx
│   │   ├── cookie-consent.tsx, pwa-install-banner.tsx
│   │   ├── enrichment/           # Book enrichment sheets
│   │   ├── habits/               # Habit cards + day/week/month views
│   │   ├── news/                 # News card + post form + book-list/spotlight pages
│   │   └── targets/              # Reading-target form, card, tab
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # createBrowserClient
│   │   │   ├── server.ts         # createServerClient + cookies()
│   │   │   └── middleware.ts     # updateSession (the auth gate)
│   │   ├── auth-errors.ts        # friendlyAuthError mapper
│   │   ├── auth-alert.ts         # reportAuthFailure (telemetry)
│   │   ├── targets.ts            # Reading-target progress/history math
│   │   ├── habits.ts             # Habit math
│   │   ├── news-book-meta.ts     # Book-list/spotlight news post helpers
│   │   └── enrichment/           # Enrichment trigger hook + client + types
│   │
│   └── types/                    # Shared TS types
│
├── netlify/functions/            # Empty — all server work lives in src/app/api/
├── supabase/migrations/          # Migrations (most live in inprose-v2; this is a small mirror)
│
├── docs/                         # Feature docs
│   ├── README.md                 # Doc index
│   ├── ARCHITECTURE.md           # Routing, RSC, Tailwind v4, Serwist
│   ├── AUTHENTICATION.md         # Supabase SSR + middleware + auth flows
│   ├── API_AND_INTEGRATIONS.md   # API routes, ISBNdb, Netlify functions decision
│   └── FEATURES.md               # Feature-area map (where does feature X live?)
│
└── local-workspace/              # Gitignored scratch area for releases / drafts
```

---

## 🔑 Key Files & Components

### Entry & shell
- `src/app/layout.tsx` — root layout, font, providers
- `src/components/auth-provider.tsx` — `useAuth()` hook (`{ user, loading, signOut }`)
- `src/components/app-shell.tsx` — sidebar + mobile bottom nav (renders only when `user` is non-null)
- `middleware.ts` + `src/lib/supabase/middleware.ts` — the auth gate

### Supabase
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (RSC, route handlers, server actions)
- `src/lib/supabase/middleware.ts` — middleware client (also contains all redirect logic)

### Auth flows
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` — email + Apple/Google OAuth
- `src/app/auth/callback/route.ts` — OAuth code exchange
- `src/app/auth/confirm/route.ts` — email OTP verification
- `src/app/forgot-password/`, `src/app/reset-password/` — password reset
- `src/app/signup/profile/page.tsx` — username + display name (forced redirect target)

### Marketing + content
- `src/app/page.tsx` + `src/app/home-switch.tsx` — server-rendered marketing → swaps to client `Dashboard` when authed
- `src/app/news/`, `src/components/news/`, `src/lib/news-book-meta.ts` — public news / blog
- `src/app/admin/news/`, `src/components/news/news-post-form.tsx` — admin editor

### Library / books
- `src/app/(protected)/library/`, `src/app/book/[isbn]/`, `src/app/u/[username]/` — authed + public surfaces
- `src/components/book-card.tsx`, `src/components/book-edit-wrapper.tsx`
- `src/app/api/library/`, `src/app/api/search/`, `src/app/api/import/`

### Data helpers
- `src/lib/targets.ts` — reading-target progress math (mirror of iOS `ReadingTargetService`)
- `src/lib/habits.ts` — habit math
- `src/lib/enrichment/` — book enrichment trigger hook

---

## 📋 Common Development Patterns

### Server Component fetching data

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

### Client Component using auth + browser client

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

export function MyComponent() {
  const { user } = useAuth();
  const supabase = createClient();
  // ... useEffect, fetch, etc.
}
```

### Route handler

```ts
// src/app/api/.../route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

### Public profile / share-link / book pages

These render via the public Supabase client (no `auth.getUser()`); RLS allows anon reads of `public` rows. Use `export const revalidate = 60` (or similar) to enable ISR caching where appropriate.

### Vanity username redirect

`netlify.toml` rewrites `/@username` → `/u/username`. Don't add a separate route; just use `/u/[username]`.

---

## ⚠️ Known Issues & Gotchas

### 1. `api/library/route.ts` and `api/library/isbns/route.ts` are duplicates
Both files contain identical logic (returns either bare ISBN list or full book details with reads attached, gated by `?details=1`). One should be removed once callers are consolidated. **When editing one, edit both** until the dup is resolved.

### 2. Middleware runs on every request — keep it cheap
`updateSession` already does a Supabase call per request (`getUser`) plus a `profiles` lookup for protected routes. Adding more DB calls in middleware will multiply across every page load. Push expensive work into `route.ts` or RSC instead.

### 3. The `(protected)/` route group is **not** the auth gate
`src/app/(protected)/layout.tsx` is a passthrough. Auth enforcement happens in `middleware.ts` via the `PROTECTED_ROUTES` array. If you add a new protected route, **also add its prefix to `PROTECTED_ROUTES` in `src/lib/supabase/middleware.ts`** — otherwise it will be reachable while logged out.

### 4. Admin routes are double-gated
Both `middleware.ts` (checks `profiles.is_admin`) and `src/app/admin/layout.tsx` (server-side `redirect("/")`) gate `/admin/*`. Both are required — the layout protects against bypassing middleware (e.g. via `revalidate`/static rendering edge cases).

### 5. Tailwind v4 has no config file
There is no `tailwind.config.js` or `tailwind.config.ts`. All tokens live in `src/app/globals.css` under `@theme`. To add a colour, font, or radius, edit that block — don't create a config file.

### 6. `netlify/functions/` is empty
All server work currently lives in App Router `route.ts` files. Reach for a Netlify function only if you need something App Router can't do (long-running cron, webhook with non-Next deployment isolation). Default to a `route.ts`.

### 7. The `signup` API route is for the **waitlist**, not auth
`src/app/api/signup/route.ts` writes to a `signups` table (using the service-role key + Cloudflare Turnstile). **It does not create a Supabase auth user.** Auth signup is handled client-side in `src/app/signup/page.tsx` via `supabase.auth.signUp()`.

### 8. Profile completion is forced before any protected route
If `profiles.username` is null, middleware redirects to `/signup/profile` regardless of the requested path (except `/signup/profile` itself). OAuth callbacks (`auth/callback`, `auth/confirm`) also redirect to `/signup/profile` if the profile is incomplete.

### 9. `auth/callback` vs `auth/confirm`
- `auth/callback` — OAuth code exchange (Apple, Google)
- `auth/confirm` — Email OTP (signup confirmation, password recovery, email change)
- They have separate redirect logic — don't merge them.

### 10. Branch deploys are disabled
Pushing to a non-PR branch on Netlify will fail (`branch-deploy` is set to `exit 1`). Only `main` deploys to production; PRs get preview URLs. To test something live, open a PR.

### 11. `image-gallery.tsx` and remote image hosts
Next.js `next/image` only allows the hosts whitelisted in `next.config.ts` (`*.supabase.co/storage/v1/object/public/**`, `images.isbndb.com`, `covers.openlibrary.org`). New external image sources must be added there.

---

## 🔄 Development Workflows

### Setup

```bash
npm install
cp .env.local.example .env.local   # Fill Supabase + ISBNdb keys
npm run dev                         # Turbopack dev server on :3000
```

### Required env vars

| Var | Used by | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All clients | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All clients | Everything |
| `ISBNDB_API_KEY` | `api/search`, `api/import/stream-meta` | Search + ISBNdb fallback |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `api/signup` only | Waitlist signup |
| `TURNSTILE_SECRET_KEY` | `api/signup` only | Waitlist captcha verify |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `signup-form.tsx` (marketing) | Waitlist captcha widget |

### Build

```bash
npm run build      # Next.js production build (also runs Serwist)
npm start          # Run prod build locally
npm run lint       # ESLint via next/core-web-vitals
```

### Deploy workflow

| Branch | Purpose | Deploy? |
|---|---|---|
| `main` | Production (`inprose.co.uk`) | Auto on push |
| `dev` | Daily development | No (branch deploys disabled) |
| PR branch | Feature/fix work | Preview URL on PR open |

Daily flow:
1. Work on `dev` (or feature branch off `dev`).
2. When ready, merge `dev` → `main` via PR.
3. Netlify builds `main` and deploys to production.

The 300 build-minute / month free-tier cap is the reason branch deploys are disabled — every push doesn't burn minutes.

---

## 📝 Documentation Maintenance (REQUIRED)

If your change touches a feature, update the matching doc in the same PR.

| If you change... | Update... |
|---|---|
| Routing, route groups, RSC patterns, Tailwind v4, Serwist | `docs/ARCHITECTURE.md` |
| `middleware.ts`, `src/lib/supabase/*`, auth flows, login/signup/reset | `docs/AUTHENTICATION.md` |
| `src/app/api/**`, ISBNdb integration, Netlify function decisions | `docs/API_AND_INTEGRATIONS.md` |
| Any feature surface (library, news, friends, stats, admin, public profile, share link, etc.) | `docs/FEATURES.md` |
| Tech stack, project structure, deploy workflow, top-level gotchas | `CLAUDE.md` (this file) |
| Database schema, RPCs, RLS — these are owned by the iOS repo | `inprose-v2/docs/DATABASE_SCHEMA.md` (link, don't duplicate) |

For backend behaviour, **link to the iOS repo docs**:
- Schema: `inprose-v2/docs/DATABASE_SCHEMA.md`
- Edge functions, triggers, RLS model: `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md`
- Search/metadata pipeline: `inprose-v2/docs/SEARCH_AND_METADATA.md`

---

## 💡 Quick Decision Matrix

| If you're working on... | Read first | Check these files |
|---|---|---|
| Auth / login / middleware / protected routes | `docs/AUTHENTICATION.md` | `middleware.ts`, `src/lib/supabase/middleware.ts`, `src/components/auth-provider.tsx` |
| App Router conventions / RSC / Tailwind v4 | `docs/ARCHITECTURE.md` | `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts` |
| API routes / ISBNdb / search / import | `docs/API_AND_INTEGRATIONS.md` | `src/app/api/**`, `src/app/api/import/shared.ts` |
| Library / book pages / public book / share link | `docs/FEATURES.md` | `src/app/(protected)/library/`, `src/app/book/[isbn]/`, `src/app/s/[code]/` |
| News / admin editor | `docs/FEATURES.md` | `src/app/news/`, `src/app/admin/news/`, `src/components/news/`, `src/lib/news-book-meta.ts` |
| Public profile (`/u/[username]`) | `docs/FEATURES.md` | `src/app/u/[username]/page.tsx` |
| Reading targets / habits | `docs/FEATURES.md` | `src/lib/targets.ts`, `src/lib/habits.ts`, `src/components/targets/`, `src/components/habits/` |
| PWA / service worker / offline | `docs/ARCHITECTURE.md` (Serwist section) | `src/app/sw.ts`, `next.config.ts`, `src/components/pwa-install-banner.tsx` |
| Database schema / RLS | iOS `inprose-v2/docs/DATABASE_SCHEMA.md` | `supabase/migrations/` |
| Deploy / Netlify config / headers / redirects | `CLAUDE.md` Deploy section + `netlify.toml` | `netlify.toml` |

---

## 📌 Conventions

### Naming
- **Routes:** kebab-case directories (`forgot-password/`, `signup-success/`)
- **Components:** kebab-case files (`book-card.tsx`), PascalCase exports (`export function BookCard`)
- **Hooks:** `use-*.tsx` files exporting `useThing`
- **Path imports:** always use `@/` alias (e.g. `@/components/auth-provider`, `@/lib/supabase/client`) — never relative `../../../`

### Styling
- Tailwind utilities only — no inline `style={...}` for spacing/colours
- Use theme tokens (`bg-accent`, `text-text-muted`, `font-serif`) — not raw hex
- `rounded-(--radius-card)` / `rounded-(--radius-input)` — CSS-var arbitrary syntax
- App is **light-mode only** (no dark mode tokens defined)

### Code style
- Prefer Server Components for data fetching
- Add `"use client"` only when actually needed (state, effects, browser APIs, event handlers)
- Server actions over `route.ts` for trivial mutations on the same page; `route.ts` when called from multiple places or needs streaming
- Always handle the unauthenticated branch in route handlers — return 401, don't throw

---

## 📌 Notes for Future AI Agents

- **Backend (DB, RPCs, RLS, edge functions, triggers) lives in the iOS repo.** Don't duplicate that documentation here — link to `inprose-v2/docs/`.
- **Auth gating happens in `middleware.ts`, not the `(protected)/` layout.** Adding a route to `(protected)/` is not enough; add it to `PROTECTED_ROUTES`.
- **Tailwind v4 is config-less** — edit `globals.css` `@theme` block, not a JS config.
- **Netlify deploys only on `main`.** Daily work happens on `dev`. Don't push WIP to `main`.
- **The two `api/library` routes are duplicates** — fix together until consolidated.
- When in doubt, read the iOS repo's `CLAUDE.md` and `docs/` — many patterns are shared.
