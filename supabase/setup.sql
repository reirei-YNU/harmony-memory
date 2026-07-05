-- Harmony Memory: Supabase schema, RLS policies, and storage bucket setup.
-- Paste this whole file into the Supabase Dashboard > SQL Editor and run it.
-- Safe to re-run any number of times (tables/functions use IF NOT EXISTS /
-- OR REPLACE, and every policy is dropped before being recreated).
--
-- IMPORTANT: if this project uses Database Branching, make sure the branch
-- selector in the top bar matches the branch your app's VITE_SUPABASE_URL
-- actually points to before running this — otherwise it'll succeed here but
-- the app will still see an empty database.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  levels text[] not null default array['初級', '中級', '上級', '発表会用'],
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  composer text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  level text not null,
  title text,
  memo text,
  storage_path text not null,
  duration_sec numeric not null,
  size_bytes bigint not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists songs_group_id_idx on public.songs (group_id);
create index if not exists recordings_group_id_idx on public.recordings (group_id);
create index if not exists recordings_song_id_idx on public.recordings (song_id);
create index if not exists group_members_user_id_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to avoid RLS self-recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups
    where id = gid and owner_id = auth.uid()
  );
$$;

-- Looks a group up by invite code and joins the caller to it in one atomic,
-- privilege-escalated step. This is the ONLY way a non-member can discover a
-- group's id: `groups` itself is never listable by non-members (see the
-- select policy below), so an invite code can't be brute-forced by paging
-- through the table.
create or replace function public.join_group_by_invite_code(code text, member_display_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  select * into g from public.groups where invite_code = upper(trim(code));
  if not found then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.group_members (group_id, user_id, display_name)
  values (g.id, auth.uid(), coalesce(nullif(trim(member_display_name), ''), '名無し'))
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

grant execute on function public.join_group_by_invite_code(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.songs enable row level security;
alter table public.recordings enable row level security;

-- groups: members can read, plus the owner (even before their own
-- group_members row exists — e.g. the instant after INSERT ... RETURNING
-- when creating a group, PostgREST re-checks this SELECT policy against the
-- returned row and would otherwise come back empty). Joining a new group
-- happens exclusively through join_group_by_invite_code() above, so
-- non-members never need (and never get) direct SELECT access otherwise.
drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members" on public.groups
  for select to authenticated
  using (public.is_group_member(id) or owner_id = auth.uid());

drop policy if exists "groups_insert_owner" on public.groups;
create policy "groups_insert_owner" on public.groups
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "groups_update_members" on public.groups;
create policy "groups_update_members" on public.groups
  for update to authenticated
  using (public.is_group_member(id));

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (owner_id = auth.uid());

-- group_members: a user can always see/insert/delete their own membership row;
-- any existing member can see the roster of their own groups.
drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id));

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self" on public.group_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "group_members_delete_self" on public.group_members;
create policy "group_members_delete_self" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid());

-- songs: any group member can read/create/update/delete songs in their group.
drop policy if exists "songs_select_members" on public.songs;
create policy "songs_select_members" on public.songs
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "songs_insert_members" on public.songs;
create policy "songs_insert_members" on public.songs
  for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "songs_update_members" on public.songs;
create policy "songs_update_members" on public.songs
  for update to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "songs_delete_members" on public.songs;
create policy "songs_delete_members" on public.songs
  for delete to authenticated
  using (public.is_group_member(group_id));

-- recordings: any group member can read; only the recorder or the group
-- owner can modify/delete a take.
drop policy if exists "recordings_select_members" on public.recordings;
create policy "recordings_select_members" on public.recordings
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "recordings_insert_members" on public.recordings;
create policy "recordings_insert_members" on public.recordings
  for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "recordings_update_own" on public.recordings;
create policy "recordings_update_own" on public.recordings
  for update to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

drop policy if exists "recordings_delete_own" on public.recordings;
create policy "recordings_delete_own" on public.recordings
  for delete to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

-- ---------------------------------------------------------------------------
-- Storage: a private "recordings" bucket, path convention
--   {group_id}/{song_id}/{recording_id}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 26214400, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recordings_storage_select" on storage.objects;
create policy "recordings_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recordings'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "recordings_storage_insert" on storage.objects;
create policy "recordings_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "recordings_storage_delete" on storage.objects;
create policy "recordings_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recordings'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );
