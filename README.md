# in-prose-site

Web repo for the in prose app — [inprose.co.uk](https://inprose.co.uk)

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (Auth, PostgreSQL, Storage)
- **Tailwind CSS 4**
- **Netlify** (hosting, deploy previews)

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # fill in Supabase + ISBNdb keys
npm run dev
```

## Deployment Workflow

Production deploys only happen when code is merged to `main`.

| Branch | Purpose | Auto-deploy? |
|--------|---------|-------------|
| `main` | Production (inprose.co.uk) | Yes |
| `dev` | Daily development | No |
| PR branches | Feature/fix work | Deploy preview only |

### How it works

1. **Daily development** happens on `dev` (or feature branches off `dev`).
2. **When ready to deploy**, merge `dev` → `main` via PR or direct merge.
3. **Netlify auto-builds** on push to `main` and deploys to production.
4. **Pull requests** get deploy preview URLs automatically — useful for reviewing changes before merging.
5. **Branch deploys** for non-PR branches are disabled to save build minutes.

### Why?

Netlify's free tier has 300 build minutes/month. Deploying every WIP commit to production wastes minutes and risks serving broken pages. This workflow ensures only intentional, ready code goes live.
