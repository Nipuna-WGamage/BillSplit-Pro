drop policy if exists "Group members can read shared groups"
  on public.shared_groups;

create policy "Group members and owners can read shared groups"
  on public.shared_groups
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (select public.is_group_member(id))
  );
