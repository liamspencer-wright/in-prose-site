# in-prose-site Documentation

Internal documentation for the In Prose website (`inprose.co.uk`). For project context, conventions, and deploy workflow, start with [`../CLAUDE.md`](../CLAUDE.md).

## Index

| Doc | When to read |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | App Router conventions, route groups, server vs client components, Tailwind v4, Serwist PWA, fonts, layout & styling rules |
| [`AUTHENTICATION.md`](./AUTHENTICATION.md) | The three Supabase clients, the middleware auth gate, all login / signup / OAuth / OTP / password-reset flows, client-side `useAuth()` context |
| [`API_AND_INTEGRATIONS.md`](./API_AND_INTEGRATIONS.md) | Every `src/app/api/**` route handler, ISBNdb integration, Cloudflare Turnstile, env vars, when to use a Netlify function vs an App Router route |
| [`FEATURES.md`](./FEATURES.md) | Feature-area map: where every user-facing surface lives, with file pointers and data sources |

## Backend documentation lives in the iOS repo

The Supabase database schema, RPCs, RLS policies, edge functions, and triggers are owned by the iOS repo:

- `inprose-v2/CLAUDE.md`
- `inprose-v2/docs/DATABASE_SCHEMA.md` — 69 tables, 9 views, ~80 RPCs, all enums, triggers, RLS policies
- `inprose-v2/docs/SUPABASE_INFRASTRUCTURE.md` — edge functions, triggers, RLS security model
- `inprose-v2/docs/SEARCH_AND_METADATA.md` — shared ISBNdb pipeline
- Every other `inprose-v2/docs/*.md` for the matching feature area

When working on something that crosses both repos (e.g. a new column, a new RPC), update the iOS docs alongside the migration.
