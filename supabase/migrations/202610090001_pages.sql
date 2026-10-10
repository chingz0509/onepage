-- Public URLs contain only a slug. Editing requires a separate secret held by
-- the publishing browser; its SHA-256 hash is never exposed to visitors.
create table if not exists public.onepage_pages (
  slug text primary key check (slug ~ '^[A-Za-z0-9_-]{12}$'),
  edit_token_hash text not null check (length(edit_token_hash) = 64),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onepage_pages enable row level security;
revoke all on public.onepage_pages from anon, authenticated;
-- All reads/writes go through the same-origin API. Only the server's
-- service-role key can access this table; it must never use a VITE_ prefix.
grant select, insert, update on public.onepage_pages to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('onepage-avatars', 'onepage-avatars', true, 131072, array['image/jpeg'])
on conflict (id) do nothing;
-- No client write policy: avatars are uploaded by the server after checking
-- the edit credential. Public avatar URLs are intentional profile content.
