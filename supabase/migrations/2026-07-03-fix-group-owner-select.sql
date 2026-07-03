-- Fixes "can't create a group": the owner couldn't see the row they just
-- created because, at INSERT time, their group_members row doesn't exist
-- yet, so is_group_member() was still false when PostgREST re-checked the
-- SELECT policy for the RETURNING data.
--
-- Run this once in the Supabase SQL Editor on any project that already ran
-- the original supabase/setup.sql.

drop policy if exists "groups_select_members" on public.groups;

create policy "groups_select_members" on public.groups
  for select to authenticated
  using (public.is_group_member(id) or owner_id = auth.uid());
