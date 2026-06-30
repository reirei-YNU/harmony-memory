-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  experience text not null default 'beginner0',
  recording_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Practice sessions
create table public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  duration_sec int not null,
  piece text,
  note text,
  created_at timestamptz not null default now()
);

-- Recordings
create table public.recordings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  piece text not null,
  note text,
  visibility text not null default 'public',
  duration_sec int not null default 0,
  audio_path text not null,
  level_n int not null default 1,
  level_title text not null default 'はじめの一歩',
  experience text not null default 'beginner0',
  created_at timestamptz not null default now()
);

-- Comments
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  recording_id uuid not null references public.recordings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- =====================
-- Row Level Security
-- =====================

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.recordings enable row level security;
alter table public.comments enable row level security;

-- profiles: everyone can read, only owner can update
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete" on public.profiles for delete using (auth.uid() = id);

-- practice_sessions: owner only
create policy "sessions_all" on public.practice_sessions for all using (auth.uid() = user_id);

-- recordings: read based on visibility, write by owner
create policy "recordings_read_public" on public.recordings
  for select using (
    visibility = 'public'
    or auth.uid() = user_id
  );
create policy "recordings_insert" on public.recordings for insert with check (auth.uid() = user_id);
create policy "recordings_update" on public.recordings for update using (auth.uid() = user_id);
create policy "recordings_delete" on public.recordings for delete using (auth.uid() = user_id);

-- comments: read if can see recording, write if authenticated
create policy "comments_read" on public.comments
  for select using (
    exists (
      select 1 from public.recordings r
      where r.id = recording_id
      and (r.visibility = 'public' or r.user_id = auth.uid())
    )
  );
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id and auth.uid() is not null);
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);

-- =====================
-- Storage bucket
-- =====================
-- Run in Supabase Dashboard > Storage > New bucket: "recordings" (private)
-- Then add policy: authenticated users can upload to their own folder,
-- and signed URLs control access.

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, experience, recording_count)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'beginner0', 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
