create table if not exists public.shared_groups (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shared_groups_data_is_group check (
    jsonb_typeof(data) = 'object'
    and coalesce(jsonb_typeof(data->'members') = 'array', false)
    and coalesce(jsonb_typeof(data->'expenses') = 'array', false)
    and coalesce(jsonb_typeof(data->'settlements') = 'array', false)
  )
);

create table if not exists public.group_members (
  group_id text not null references public.shared_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_id text not null,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (group_id, member_id)
);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.shared_groups (id) on delete cascade,
  member_id text not null,
  email text not null check (email = lower(email)),
  display_name text not null check (length(display_name) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists group_invitations_one_pending_email
  on public.group_invitations (group_id, email)
  where accepted_at is null and cancelled_at is null;

create index if not exists group_members_user_id_idx
  on public.group_members (user_id, group_id);

create or replace function public.is_valid_group_data(p_data jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item jsonb;
  participant jsonb;
  member_ids text[] := array[]::text[];
  expense_ids text[] := array[]::text[];
  settlement_ids text[] := array[]::text[];
  participant_ids text[];
  amount numeric;
  item_date date;
  admin_count integer := 0;
begin
  if jsonb_typeof(p_data) is distinct from 'object'
    or jsonb_typeof(p_data->'members') is distinct from 'array'
    or jsonb_typeof(p_data->'expenses') is distinct from 'array'
    or jsonb_typeof(p_data->'settlements') is distinct from 'array'
    or coalesce(p_data->>'id', '') = ''
    or coalesce(p_data->>'name', '') = ''
    or coalesce(p_data->>'category', '') not in ('Household', 'Trip', 'Family', 'Other')
    or jsonb_typeof(p_data->'location') is distinct from 'string'
    or jsonb_typeof(p_data->'description') is distinct from 'string' then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_data->'members') as entry(value)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or jsonb_typeof(item->'name') is distinct from 'string'
      or jsonb_typeof(item->'email') is distinct from 'string'
      or coalesce(item->>'id', '') = ''
      or coalesce(item->>'name', '') = ''
      or coalesce(item->>'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or coalesce(item->>'role', '') not in ('Admin', 'Member')
      or item->>'id' = any(member_ids) then
      return false;
    end if;

    if item->>'role' = 'Admin' then
      admin_count := admin_count + 1;
    end if;
    member_ids := array_append(member_ids, item->>'id');
  end loop;

  if cardinality(member_ids) = 0 or admin_count = 0 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_data->'expenses') as entry(value)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or jsonb_typeof(item->'description') is distinct from 'string'
      or coalesce(item->>'description', '') = ''
      or length(item->>'description') > 100
      or coalesce(item->>'category', '') not in (
        'Rent', 'Electricity', 'Water', 'Groceries', 'Internet', 'Other'
      )
      or jsonb_typeof(item->'amountMinor') is distinct from 'number'
      or jsonb_typeof(item->'paidByMemberId') is distinct from 'string'
      or not (item->>'paidByMemberId' = any(member_ids))
      or jsonb_typeof(item->'date') is distinct from 'string'
      or jsonb_typeof(item->'notes') is distinct from 'string'
      or length(item->>'notes') > 500
      or jsonb_typeof(item->'participantMemberIds') is distinct from 'array'
      or jsonb_typeof(item->'settled') is distinct from 'boolean'
      or coalesce(item->>'id', '') = ''
      or item->>'id' = any(expense_ids) then
      return false;
    end if;

    amount := (item->>'amountMinor')::numeric;
    if amount <= 0 or amount <> trunc(amount) or amount > 9007199254740991 then
      return false;
    end if;

    if (item->>'date') !~ '^\d{4}-\d{2}-\d{2}$' then
      return false;
    end if;
    begin
      item_date := (item->>'date')::date;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        return false;
    end;
    if to_char(item_date, 'YYYY-MM-DD') <> item->>'date'
      or item_date > current_date + 1 then
      return false;
    end if;

    participant_ids := array[]::text[];
    for participant in
      select value
      from jsonb_array_elements(item->'participantMemberIds') as participant_entry(value)
    loop
      if jsonb_typeof(participant) is distinct from 'string'
        or not ((participant #>> '{}') = any(member_ids))
        or (participant #>> '{}') = any(participant_ids) then
        return false;
      end if;
      participant_ids := array_append(participant_ids, participant #>> '{}');
    end loop;

    if cardinality(participant_ids) = 0 then
      return false;
    end if;
    expense_ids := array_append(expense_ids, item->>'id');
  end loop;

  for item in select value from jsonb_array_elements(p_data->'settlements') as entry(value)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or coalesce(item->>'id', '') = ''
      or item->>'id' = any(settlement_ids)
      or jsonb_typeof(item->'fromMemberId') is distinct from 'string'
      or jsonb_typeof(item->'toMemberId') is distinct from 'string'
      or item->>'fromMemberId' = item->>'toMemberId'
      or not (item->>'fromMemberId' = any(member_ids))
      or not (item->>'toMemberId' = any(member_ids))
      or jsonb_typeof(item->'amountMinor') is distinct from 'number'
      or jsonb_typeof(item->'date') is distinct from 'string'
      or jsonb_typeof(item->'notes') is distinct from 'string'
      or length(item->>'notes') > 250 then
      return false;
    end if;

    amount := (item->>'amountMinor')::numeric;
    if amount <= 0 or amount <> trunc(amount) or amount > 9007199254740991 then
      return false;
    end if;

    if (item->>'date') !~ '^\d{4}-\d{2}-\d{2}$' then
      return false;
    end if;
    begin
      item_date := (item->>'date')::date;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        return false;
    end;
    if to_char(item_date, 'YYYY-MM-DD') <> item->>'date'
      or item_date > current_date + 1 then
      return false;
    end if;
    settlement_ids := array_append(settlement_ids, item->>'id');
  end loop;

  return true;
end;
$$;

revoke all on function public.is_valid_group_data(jsonb) from public, anon, authenticated;

create or replace function public.is_group_member(p_group_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_owner(p_group_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shared_groups sg
    where sg.id = p_group_id
      and sg.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(text) from public, anon;
revoke all on function public.is_group_owner(text) from public, anon;
grant execute on function public.is_group_member(text) to authenticated;
grant execute on function public.is_group_owner(text) to authenticated;

create or replace function public.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_member_id text;
begin
  select member.value->>'id'
  into owner_member_id
  from jsonb_array_elements(new.data->'members') as member(value)
  where member.value->>'role' = 'Admin'
  limit 1;

  insert into public.group_members (group_id, user_id, member_id, role)
  values (
    new.id,
    new.owner_id,
    coalesce(owner_member_id, 'owner-' || new.id),
    'owner'
  );

  return new;
end;
$$;

create or replace function public.remove_deleted_group_memberships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.group_members gm
  where gm.group_id = new.id
    and gm.role <> 'owner'
    and not exists (
      select 1
      from jsonb_array_elements(new.data->'members') as member(value)
      where member.value->>'id' = gm.member_id
    );

  return new;
end;
$$;

create or replace function public.validate_shared_group_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.data->>'id' is distinct from new.id
    or not public.is_valid_group_data(new.data) then
    raise exception 'The saved group data is invalid.';
  end if;

  return new;
end;
$$;

drop trigger if exists shared_groups_validate_data on public.shared_groups;
create trigger shared_groups_validate_data
  before insert or update of data on public.shared_groups
  for each row execute function public.validate_shared_group_data();

drop trigger if exists shared_groups_add_owner_membership on public.shared_groups;
create trigger shared_groups_add_owner_membership
  after insert on public.shared_groups
  for each row execute function public.add_group_owner_membership();

drop trigger if exists shared_groups_remove_deleted_memberships on public.shared_groups;
create trigger shared_groups_remove_deleted_memberships
  after update of data on public.shared_groups
  for each row execute function public.remove_deleted_group_memberships();

alter table public.shared_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;

revoke all on table public.shared_groups from anon, authenticated;
revoke all on table public.group_members from anon, authenticated;
revoke all on table public.group_invitations from anon, authenticated;
grant select, insert on table public.shared_groups to authenticated;
grant select on table public.group_members to authenticated;
grant select on table public.group_invitations to authenticated;

drop policy if exists "Group members can read shared groups" on public.shared_groups;
create policy "Group members can read shared groups"
  on public.shared_groups
  for select
  to authenticated
  using ((select public.is_group_member(id)));

drop policy if exists "Users can create groups they own" on public.shared_groups;
create policy "Users can create groups they own"
  on public.shared_groups
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Group members can read memberships" on public.group_members;
create policy "Group members can read memberships"
  on public.group_members
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_group_member(group_id)));

drop policy if exists "Owners and invited users can read invitations" on public.group_invitations;
create policy "Owners and invited users can read invitations"
  on public.group_invitations
  for select
  to authenticated
  using (
    (select public.is_group_owner(group_id))
    or lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  );

create or replace function public.save_group_data(p_group_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_group public.shared_groups%rowtype;
  owner_member_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in before saving group changes.';
  end if;

  if jsonb_typeof(p_data) is distinct from 'object'
    or jsonb_typeof(p_data->'members') is distinct from 'array'
    or jsonb_typeof(p_data->'expenses') is distinct from 'array'
    or jsonb_typeof(p_data->'settlements') is distinct from 'array'
    or p_data->>'id' is distinct from p_group_id then
    raise exception 'The group data is invalid.';
  end if;

  select *
  into current_group
  from public.shared_groups
  where id = p_group_id
  for update;

  if not found or not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group.';
  end if;

  if current_group.owner_id <> (select auth.uid()) then
    if (p_data - 'expenses' - 'settlements')
      is distinct from (current_group.data - 'expenses' - 'settlements') then
      raise exception 'Only the group owner can change group details or membership.';
    end if;
  else
    select gm.member_id
    into owner_member_id
    from public.group_members gm
    where gm.group_id = p_group_id and gm.role = 'owner';

    if owner_member_id is null or not exists (
      select 1
      from jsonb_array_elements(p_data->'members') as member(value)
      where member.value->>'id' = owner_member_id
    ) then
      raise exception 'The group owner cannot be removed.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(current_group.data->'members') as old_member(value)
      where not exists (
        select 1
        from jsonb_array_elements(p_data->'members') as new_member(value)
        where new_member.value->>'id' = old_member.value->>'id'
      )
      and (
        exists (
          select 1
          from jsonb_array_elements(current_group.data->'expenses') as expense(value)
          where expense.value->>'paidByMemberId' = old_member.value->>'id'
            or (expense.value->'participantMemberIds') ? (old_member.value->>'id')
        )
        or exists (
          select 1
          from jsonb_array_elements(current_group.data->'settlements') as settlement(value)
          where settlement.value->>'fromMemberId' = old_member.value->>'id'
            or settlement.value->>'toMemberId' = old_member.value->>'id'
        )
      )
    ) then
      raise exception 'A member referenced by financial history cannot be removed.';
    end if;
  end if;

  update public.shared_groups
  set data = p_data, updated_at = now()
  where id = p_group_id;
end;
$$;

create or replace function public.create_group_invitation(
  p_group_id text,
  p_email text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_name text := trim(p_display_name);
  invitation_id uuid;
  group_data jsonb;
  existing_member_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in before inviting a group member.';
  end if;

  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the group owner can invite members.';
  end if;

  if length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(normalized_name) not between 1 and 80 then
    raise exception 'Enter a valid email address and a name up to 80 characters.';
  end if;

  if normalized_email = lower(coalesce((select auth.jwt()->>'email'), '')) then
    raise exception 'You are already a member of this group.';
  end if;

  select data into group_data
  from public.shared_groups
  where id = p_group_id;

  select member.value->>'id'
  into existing_member_id
  from jsonb_array_elements(group_data->'members') as member(value)
  where lower(member.value->>'email') = normalized_email
  limit 1;

  if existing_member_id is not null and exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.member_id = existing_member_id
  ) then
    raise exception 'This email is already an active group member.';
  end if;

  if existing_member_id is not null and exists (
    select 1
    from jsonb_array_elements(group_data->'members') as member(value)
    where member.value->>'id' = existing_member_id
      and member.value->>'role' = 'Admin'
  ) then
    raise exception 'The group admin cannot be invited as a member.';
  end if;

  if existing_member_id is null then
    existing_member_id := 'member-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(group_data->'members') as member(value)
    where lower(member.value->>'email') = normalized_email
      and member.value->>'id' <> existing_member_id
  ) then
    raise exception 'This email is associated with another group member.';
  end if;

  insert into public.group_invitations (
    group_id,
    member_id,
    email,
    display_name,
    created_by
  )
  values (
    p_group_id,
    existing_member_id,
    normalized_email,
    normalized_name,
    (select auth.uid())
  )
  on conflict (group_id, email)
    where accepted_at is null and cancelled_at is null
  do update set
    member_id = excluded.member_id,
    display_name = excluded.display_name,
    created_by = excluded.created_by,
    created_at = now(),
    expires_at = now() + interval '7 days'
  returning id into invitation_id;

  return invitation_id;
end;
$$;

create or replace function public.cancel_group_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_invitations
  set cancelled_at = now()
  where id = p_invitation_id
    and accepted_at is null
    and cancelled_at is null
    and public.is_group_owner(group_id);

  if not found then
    raise exception 'This pending invitation could not be cancelled.';
  end if;
end;
$$;

create or replace function public.accept_group_invitation(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.group_invitations%rowtype;
  group_data jsonb;
  updated_members jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in with the invited email address to accept this invitation.';
  end if;

  select *
  into invite
  from public.group_invitations
  where id = p_invitation_id
    and lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    and accepted_at is null
    and cancelled_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This invitation is invalid, expired, or addressed to a different account.';
  end if;

  select data into group_data
  from public.shared_groups
  where id = invite.group_id
  for update;

  if not found or exists (
    select 1
    from jsonb_array_elements(group_data->'members') as member(value)
    where lower(member.value->>'email') = lower(invite.email)
      and member.value->>'id' <> invite.member_id
  ) then
    raise exception 'This account is already represented in the group or the group no longer exists.';
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = invite.group_id
      and gm.user_id = (select auth.uid())
  ) then
    raise exception 'This account is already a member of the group.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(group_data->'members') as member(value)
    where member.value->>'id' = invite.member_id
      and member.value->>'role' = 'Admin'
  ) then
    raise exception 'The group admin cannot join through an invitation.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(group_data->'members') as member(value)
    where member.value->>'id' = invite.member_id
  ) then
    select jsonb_agg(
      case
        when member.value->>'id' = invite.member_id then
          member.value || jsonb_build_object(
            'name', invite.display_name,
            'email', invite.email,
            'role', 'Member'
          )
        else member.value
      end
      order by member.ordinality
    )
    into updated_members
    from jsonb_array_elements(group_data->'members') with ordinality
      as member(value, ordinality);
  else
    updated_members := (group_data->'members') || jsonb_build_array(jsonb_build_object(
      'id', invite.member_id,
      'name', invite.display_name,
      'email', invite.email,
      'role', 'Member'
    ));
  end if;

  update public.shared_groups
  set data = jsonb_set(group_data, '{members}', updated_members, true),
  updated_at = now()
  where id = invite.group_id;

  insert into public.group_members (group_id, user_id, member_id, role)
  values (invite.group_id, (select auth.uid()), invite.member_id, 'member');

  update public.group_invitations
  set accepted_at = now()
  where id = invite.id;

  return invite.group_id;
end;
$$;

revoke all on function public.save_group_data(text, jsonb) from public, anon;
revoke all on function public.create_group_invitation(text, text, text) from public, anon;
revoke all on function public.cancel_group_invitation(uuid) from public, anon;
revoke all on function public.accept_group_invitation(uuid) from public, anon;
grant execute on function public.save_group_data(text, jsonb) to authenticated;
grant execute on function public.create_group_invitation(text, text, text) to authenticated;
grant execute on function public.cancel_group_invitation(uuid) to authenticated;
grant execute on function public.accept_group_invitation(uuid) to authenticated;

insert into public.shared_groups (id, owner_id, data)
select
  workspace.user_id::text || ':' || (legacy_group.value->>'id'),
  workspace.user_id,
  jsonb_set(
    legacy_group.value,
    '{id}',
    to_jsonb(workspace.user_id::text || ':' || (legacy_group.value->>'id')),
    true
  )
from public.user_workspaces as workspace
cross join lateral jsonb_array_elements(workspace.groups) as legacy_group(value)
where jsonb_typeof(workspace.groups) = 'array'
  and legacy_group.value->>'id' is not null
on conflict (id) do nothing;
