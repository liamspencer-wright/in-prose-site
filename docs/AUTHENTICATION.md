# Authentication

How auth works on `in-prose-site`: three Supabase clients, a single middleware-based gate, and the full set of email + OAuth flows.

> **Companion docs:**
> - `ARCHITECTURE.md` — App Router and component patterns
> - `inprose-v2/docs/AUTHENTICATION.md` — shared auth model (iOS reference)
> - `inprose-v2/docs/DATABASE_SCHEMA.md` — `profiles` table, RLS policies

---

## High-level model

- Supabase Auth issues the session (email/password, Apple OAuth, Google OAuth, magic-link / OTP for email confirmation and password recovery).
- A single `middleware.ts` intercepts every request, refreshes the session cookie, and enforces the auth/admin gate.
- `AppShell` reads a client-side `useAuth()` context to decide whether to render the logged-in chrome.
- Profile completion (`profiles.username`) is **mandatory** before any protected route — incomplete profiles are forced to `/signup/profile`.

---

## The three Supabase clients

`@supabase/ssr` 0.6 requires three different client constructors depending on context. **Use the right one — they are not interchangeable.**

| Client | File | Use in | Reason |
|---|---|---|---|
| Browser | `src/lib/supabase/client.ts` | `"use client"` components | Reads/writes cookies via the browser |
| Server | `src/lib/supabase/server.ts` | RSC, `route.ts`, server actions | Reads/writes cookies via `next/headers cookies()` |
| Middleware | `src/lib/supabase/middleware.ts` | `middleware.ts` only | Edge runtime — uses `NextRequest` cookies; refreshes the session |

### Browser client

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

Used in client components, login/signup forms, the dashboard, etc. Calls `supabase.auth.signInWithPassword()`, `signInWithOAuth()`, `signUp()`, `onAuthStateChange()`, and reads `auth.getUser()` / `auth.getSession()`.

### Server client

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cs) => cs.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)),
    },
  });
}
```

The `setAll` block is wrapped in `try/catch` because cookies can't be written from a Server Component — only from route handlers or server actions. The catch is intentional and silent; middleware refreshes the session, so RSC failures here are harmless.

Used in:
- RSC pages (`src/app/page.tsx`, `src/app/(protected)/.../page.tsx`)
- API route handlers (`src/app/api/.../route.ts`)
- Auth callback / confirm route handlers
- `admin/layout.tsx` for the server-side admin check

### Middleware client

`src/lib/supabase/middleware.ts` exports `updateSession(request)`. It builds its own `createServerClient` against the request's cookies, calls `supabase.auth.getUser()` (which refreshes the session if needed), and applies redirect logic.

`middleware.ts` is a thin wrapper:

```ts
// middleware.ts
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

The matcher excludes static assets and image responses but matches **everything else** — every page, every API route, every public page. That's intentional: session refresh must happen on every request.

---

## The auth gate (`updateSession`)

Source: `src/lib/supabase/middleware.ts`. Runs on every matching request and applies four rules:

### Rule 1 — refresh the session
Calls `supabase.auth.getUser()`, which reads the request's cookies, refreshes if needed, and writes the refreshed cookies back to `supabaseResponse`. **This is the side effect that keeps RSC sessions valid.** Without middleware, RSC reads stale cookies and `auth.getUser()` returns null even when the user is logged in.

### Rule 2 — protect logged-in routes

```ts
const PROTECTED_ROUTES = [
  "/library", "/search", "/friends", "/feed",
  "/settings", "/signup/profile", "/admin",
];
```

If `pathname.startsWith(prefix)` matches any of these and `user` is null, redirect to `/login?next=<path>&message=<contextual>`. The contextual message is selected per route (e.g. "Log in to access your library").

> **Adding a new protected route:** update `PROTECTED_ROUTES` in `src/lib/supabase/middleware.ts`. Putting a route under `(protected)/` is **not enough** — `(protected)/layout.tsx` is a passthrough.

### Rule 3 — force profile completion

If the user is logged in, on a protected route, and their `profiles.username` is null, redirect to `/signup/profile`. This means: *no logged-in user can do anything on a protected route until they pick a username and display name.*

The check costs one DB query per protected request. It's intentional — losing it would let half-onboarded users into the app.

### Rule 4 — gate `/admin` on `is_admin`

```ts
const ADMIN_ROUTES = ["/admin"];
```

If on an admin route and `profile.is_admin` is false, redirect to `/`. **Plus:** `src/app/admin/layout.tsx` does the same check server-side as a defence-in-depth measure. Both must pass.

### Rule 5 — bounce authed users away from auth pages

```ts
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];
```

If logged in and on one of these, redirect to `/`. (Reset-password is intentionally not in this list — recovery sessions need to land there.)

---

## The auth pages

### `/login` (`src/app/login/page.tsx`)

Client component (`"use client"`). Wrapped in `<Suspense>` so `useSearchParams` works during SSR.

- **Email/password:** `supabase.auth.signInWithPassword({ email, password })` → on success, `router.push(nextPath ?? "/")` + `router.refresh()`.
- **OAuth (Apple, Google):** `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: ${origin}/auth/callback?next=... } })`. Provider opens its UI, then redirects back to `/auth/callback`.
- **Error mapping:** `friendlyAuthError` (in `src/lib/auth-errors.ts`) translates Supabase errors into user-facing copy. `reportAuthFailure` (in `src/lib/auth-alert.ts`) sends telemetry on failures.
- **Query params:**
  - `next=<path>` — destination after login (only relative paths starting with `/` and not `//` are honoured — open-redirect guard)
  - `message=...` — contextual message shown above the form (set by middleware Rule 2)
  - `error=auth_callback_failed` / `error=confirmation_failed` — set by `auth/callback` and `auth/confirm`

### `/signup` (`src/app/signup/page.tsx`)

Client component.

- **Email/password:** `supabase.auth.signUp({ email, password, options: { emailRedirectTo: ${origin}/auth/callback } })`.
  - On success, the form switches to a "Check your email" panel — Supabase has emailed a confirmation link.
  - Password requirements enforced client-side: 8+ chars, lower, upper, digit, symbol.
- **OAuth:** same `signInWithOAuth` flow — OAuth signups don't need email confirmation.

> The `/api/signup` route handler is **for the marketing waitlist**, not auth. See `API_AND_INTEGRATIONS.md`.

### `/signup/profile`

Where users land after first sign-in (or any time `profiles.username` is null). Collects display name + username and writes to `profiles`. After successful submission, redirects to `/`.

### `/forgot-password` and `/reset-password`

- `/forgot-password` — collects email, calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/confirm?type=recovery })`. The email contains a link to `/auth/confirm`.
- `/reset-password` — landing page after the recovery link is clicked (and `auth/confirm` exchanges the OTP). Collects new password, calls `supabase.auth.updateUser({ password })`.

---

## OAuth callback (`src/app/auth/callback/route.ts`)

Handles **OAuth providers** (Apple, Google).

```ts
GET /auth/callback?code=...&next=/library
```

1. Reads `code` from query params.
2. `supabase.auth.exchangeCodeForSession(code)` — converts the auth code to a session, sets cookies.
3. Reads `profiles.{display_name, username}` for the new user.
4. If either is missing → redirect to `/signup/profile`.
5. Otherwise → redirect to `next` (or `/`).
6. On any error → redirect to `/login?error=auth_callback_failed`.

---

## Email OTP confirm (`src/app/auth/confirm/route.ts`)

Handles **email-based OTP flows**: signup confirmation, password recovery, email-change confirmation.

```ts
GET /auth/confirm?token_hash=...&type=signup|recovery|email
```

1. `supabase.auth.verifyOtp({ token_hash, type })`.
2. If `type === "recovery"` → redirect to `/reset-password` (still in a recovery session).
3. Otherwise (signup, email) → check profile completeness:
   - Missing `display_name` or `username` → `/signup/profile`
   - Otherwise → `/confirmed` (success page with a "Continue" link)
4. On any error → `/login?error=confirmation_failed`.

> **Don't merge `callback` and `confirm`.** They handle different exchanges (`exchangeCodeForSession` vs `verifyOtp`) and have different redirect logic.

---

## Client-side auth context

`src/components/auth-provider.tsx` exposes:

```ts
type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
```

It subscribes to `supabase.auth.onAuthStateChange` once on mount and unsubscribes on unmount. Initial state is `{ user: null, loading: true }`; on first state event, `loading` flips to `false`.

`signOut`:
```ts
await supabase.auth.signOut();
setUser(null);
router.push("/login");
router.refresh();
```

The `router.refresh()` is important: it re-runs middleware and any RSC, clearing server-rendered authed UI.

### When to use `useAuth()` vs `auth.getUser()`

- **Client components:** prefer `useAuth()` — it reuses the existing subscription, no extra DB round-trip.
- **Server components / route handlers:** use `await supabase.auth.getUser()` — there is no client-side context to read.

---

## Sign-out

Always go through `useAuth().signOut()` — never call `supabase.auth.signOut()` directly from a component. The wrapper handles the post-signout redirect and refresh, which middleware needs to see.

---

## Cookies & storage

`@supabase/ssr` writes Supabase session cookies (typically `sb-<project-ref>-auth-token` and a refresh token cookie). Middleware reads them via `request.cookies`, server client via `next/headers cookies()`, browser client via `document.cookie`. **All three must agree** — using the wrong client in the wrong context will silently desync the session.

Cookies are HttpOnly, Secure, SameSite=Lax (Supabase defaults). They survive across browser sessions until expiry/refresh.

---

## Common patterns

### Require auth in a route handler

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... user-scoped work
}
```

Don't `throw` — return a 401. Middleware doesn't gate `/api/*` (only the `PROTECTED_ROUTES` prefixes), so handlers must enforce themselves.

### Require auth in a Server Component

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // ...
}
```

For routes inside `(protected)/`, this redundancy is optional — middleware already redirects. For routes that aren't in `PROTECTED_ROUTES` but still need auth (rare), this pattern is required.

### Read auth in a Client Component

```tsx
"use client";
import { useAuth } from "@/components/auth-provider";

export function Foo() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <p>Sign in to see this.</p>;
  return <div>Hi, {user.email}</div>;
}
```

---

## Public-facing pages (no auth required)

| Route | Notes |
|---|---|
| `/` | Marketing OR Dashboard via `home-switch.tsx` |
| `/news`, `/news/[slug]` | Public news/blog |
| `/book/[isbn]` | Public book detail |
| `/u/[username]` | Public profile (`revalidate: 60`) |
| `/s/[code]` | Share link |
| `/privacy`, `/terms`, `/offline`, `/confirmed`, `/signup-success` | Static |

These rely on RLS policies allowing anon reads of `public` rows in `profiles`, `user_books`, `posts`, etc. See `inprose-v2/docs/DATABASE_SCHEMA.md` for the policies.

---

## Gotchas

1. **Don't use the wrong client.** Browser client in a Server Component will fail at build/runtime. Server client in a `"use client"` component will fail at runtime (`cookies()` is a server-only API).
2. **Middleware must run.** If you accidentally narrow `config.matcher` to exclude a route, that route's RSC will read stale cookies and behave as if the user is logged out.
3. **`/login` deny-list logic is in middleware.** If you add a new auth-related page (e.g. `/magic-link`), decide whether to add it to `AUTH_ROUTES` (bounce authed users away) or leave it accessible to everyone.
4. **Profile completion redirect can confuse.** Users who sign up via OAuth land on `/signup/profile` — make sure that page handles "I'm a brand-new user with no profile row" (it does — uses `upsert` semantics).
5. **`reset-password` is not in `AUTH_ROUTES`.** This is intentional — the recovery session must be allowed to reach the page even though `user` is non-null.
6. **`admin/layout.tsx` is duplication on purpose.** Don't remove the server-side `is_admin` check thinking middleware covers it.

---

## Cross-references

- **iOS auth (shared model):** `inprose-v2/docs/AUTHENTICATION.md`
- **`profiles` table + RLS:** `inprose-v2/docs/DATABASE_SCHEMA.md`
- **Supabase edge functions / triggers:** `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md`
