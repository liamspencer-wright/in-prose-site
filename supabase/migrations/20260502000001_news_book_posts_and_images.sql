-- Add book-centric news post types + multi-image support

alter type news_post_type_t add value if not exists 'book_spotlight';
alter type news_post_type_t add value if not exists 'book_list';

alter table news_posts
  add column if not exists spotlight_book_group_id uuid references book_groups(id) on delete set null,
  add column if not exists book_list_entries jsonb,
  add column if not exists image_urls text[] not null default '{}';

-- Storage bucket for news images (covers, galleries)
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Public read for news images
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'news_images_public_read'
  ) then
    create policy "news_images_public_read"
      on storage.objects for select
      using (bucket_id = 'news-images');
  end if;
end$$;

-- Admin write for news images
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'news_images_admin_write'
  ) then
    create policy "news_images_admin_write"
      on storage.objects for all
      using (
        bucket_id = 'news-images'
        and exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      )
      with check (
        bucket_id = 'news-images'
        and exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      );
  end if;
end$$;
