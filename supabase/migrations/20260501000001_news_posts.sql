-- News posts for the public CMS/news feed

create type news_post_type_t as enum (
  'featured_review',
  'release_notes_app',
  'release_notes_website',
  'article',
  'announcement'
);

create type news_post_status_t as enum ('draft', 'published');

create table news_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  type          news_post_type_t not null,
  body          text not null default '',
  excerpt       text,
  cover_image_url text,
  status        news_post_status_t not null default 'draft',
  published_at  timestamptz,
  author_id     uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index news_posts_feed_idx on news_posts (status, published_at desc);

alter table news_posts enable row level security;

-- Public can read published posts
create policy "news_posts_public_read"
  on news_posts for select
  using (status = 'published');

-- Only admins can insert/update/delete
create policy "news_posts_admin_write"
  on news_posts for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
