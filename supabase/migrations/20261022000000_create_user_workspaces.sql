create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  groups jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_workspaces_groups_is_array
    check (jsonb_typeof(groups) = 'array')
);

alter table public.user_workspaces enable row level security;

revoke all on table public.user_workspaces from anon, authenticated;
grant select, insert, update on table public.user_workspaces to authenticated;

create policy "Users can read their own workspace"
  on public.user_workspaces
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workspace"
  on public.user_workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workspace"
  on public.user_workspaces
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
