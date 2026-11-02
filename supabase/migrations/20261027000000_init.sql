-- FitScore initial schema: profiles, scans, private scan-image storage.
-- Scores are written only by the score-fit edge function (service role),
-- so clients can read their own scans but never insert or edit a score.

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created automatically; anonymous users included)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_path  text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Scans (one AI rating of one photo)
-- ---------------------------------------------------------------------------
create type public.scan_status as enum ('scored', 'not_scorable', 'refused');

create table public.scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  image_path    text,         -- null when the photo was not scorable (never stored)
  occasion_hint text,
  status        public.scan_status not null,
  message       text,
  overall       smallint check (overall between 0 and 100),
  headline      text,
  breakdown     jsonb,  -- {color_harmony, fit, styling, cohesion}: 0-100 each
  occasions     jsonb,  -- [{occasion, score, reason}] for every occasion
  tips          jsonb,  -- [string]
  model         text not null,
  created_at    timestamptz not null default now()
);

create index scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

create policy "scans: read own"
  on public.scans for select to authenticated
  using (user_id = auth.uid());

create policy "scans: delete own"
  on public.scans for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects stored at <user_id>/<scan_id>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', false, 5242880, array['image/jpeg']);

create policy "scan images: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scan images: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
