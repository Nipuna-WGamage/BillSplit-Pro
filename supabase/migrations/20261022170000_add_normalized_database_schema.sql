create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Member'
    check (length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  );

  insert into public.profiles (id, display_name)
  values (new.id, profile_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

insert into public.profiles (id, display_name)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  )
from auth.users as users
on conflict (id) do nothing;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.groups (
  id text primary key references public.shared_groups (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (category in ('Household', 'Trip', 'Family', 'Other')),
  location text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_people (
  group_id text not null references public.groups (id) on delete cascade,
  member_id text not null check (length(member_id) > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  email text not null check (email = lower(email)),
  role text not null check (role in ('Admin', 'Member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

create index if not exists group_people_email_idx
  on public.group_people (group_id, email);

create table if not exists public.expenses (
  group_id text not null references public.groups (id) on delete cascade,
  id text not null check (length(id) > 0),
  description text not null check (length(trim(description)) between 1 and 100),
  category text not null check (
    category in ('Rent', 'Electricity', 'Water', 'Groceries', 'Internet', 'Other')
  ),
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  paid_by_member_id text not null,
  expense_date date not null,
  notes text not null default '' check (length(notes) <= 500),
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, id),
  foreign key (group_id, paid_by_member_id)
    references public.group_people (group_id, member_id)
    on delete restrict
);

create index if not exists expenses_group_date_idx
  on public.expenses (group_id, expense_date desc, id);

create index if not exists expenses_group_payer_idx
  on public.expenses (group_id, paid_by_member_id);

create table if not exists public.expense_splits (
  group_id text not null,
  expense_id text not null,
  member_id text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  created_at timestamptz not null default now(),
  primary key (group_id, expense_id, member_id),
  foreign key (group_id, expense_id)
    references public.expenses (group_id, id)
    on delete cascade,
  foreign key (group_id, member_id)
    references public.group_people (group_id, member_id)
    on delete restrict
);

create index if not exists expense_splits_group_member_idx
  on public.expense_splits (group_id, member_id, expense_id);

create table if not exists public.settlements (
  group_id text not null references public.groups (id) on delete cascade,
  id text not null check (length(id) > 0),
  from_member_id text not null,
  to_member_id text not null,
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  settlement_date date not null,
  notes text not null default '' check (length(notes) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, id),
  check (from_member_id <> to_member_id),
  foreign key (group_id, from_member_id)
    references public.group_people (group_id, member_id)
    on delete restrict,
  foreign key (group_id, to_member_id)
    references public.group_people (group_id, member_id)
    on delete restrict
);

create index if not exists settlements_group_date_idx
  on public.settlements (group_id, settlement_date desc, id);

create or replace function public.sync_group_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.groups (
    id,
    owner_id,
    name,
    category,
    location,
    description,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.owner_id,
    new.data->>'name',
    new.data->>'category',
    new.data->>'location',
    new.data->>'description',
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    owner_id = excluded.owner_id,
    name = excluded.name,
    category = excluded.category,
    location = excluded.location,
    description = excluded.description,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

create or replace function public.sync_group_financial_data(
  p_group_id text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_people (
    group_id,
    member_id,
    display_name,
    email,
    role
  )
  select
    p_group_id,
    member.value->>'id',
    member.value->>'name',
    lower(member.value->>'email'),
    member.value->>'role'
  from jsonb_array_elements(p_data->'members') as member(value)
  on conflict (group_id, member_id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  insert into public.expenses as current_expense (
    group_id,
    id,
    description,
    category,
    amount_minor,
    paid_by_member_id,
    expense_date,
    notes,
    settled
  )
  select
    p_group_id,
    expense.value->>'id',
    expense.value->>'description',
    expense.value->>'category',
    (expense.value->>'amountMinor')::bigint,
    expense.value->>'paidByMemberId',
    (expense.value->>'date')::date,
    expense.value->>'notes',
    (expense.value->>'settled')::boolean
  from jsonb_array_elements(p_data->'expenses') as expense(value)
  on conflict (group_id, id) do update set
    description = excluded.description,
    category = excluded.category,
    amount_minor = excluded.amount_minor,
    paid_by_member_id = excluded.paid_by_member_id,
    expense_date = excluded.expense_date,
    notes = excluded.notes,
    settled = excluded.settled,
    updated_at = now()
  where (
    current_expense.description,
    current_expense.category,
    current_expense.amount_minor,
    current_expense.paid_by_member_id,
    current_expense.expense_date,
    current_expense.notes,
    current_expense.settled
  ) is distinct from (
    excluded.description,
    excluded.category,
    excluded.amount_minor,
    excluded.paid_by_member_id,
    excluded.expense_date,
    excluded.notes,
    excluded.settled
  );

  delete from public.expense_splits
  where group_id = p_group_id;

  insert into public.expense_splits (
    group_id,
    expense_id,
    member_id,
    amount_minor
  )
  with participant_rows as (
    select
      expense.value->>'id' as expense_id,
      (expense.value->>'amountMinor')::bigint as amount_minor,
      participant.member_id,
      count(*) over (partition by expense.value->>'id') as participant_count,
      row_number() over (
        partition by expense.value->>'id'
        order by participant.member_id collate "C"
      ) as participant_number
    from jsonb_array_elements(p_data->'expenses') as expense(value)
    cross join lateral jsonb_array_elements_text(
      expense.value->'participantMemberIds'
    ) as participant(member_id)
  )
  select
    p_group_id,
    participant_rows.expense_id,
    participant_rows.member_id,
    participant_rows.amount_minor / participant_rows.participant_count
      + case
          when participant_rows.participant_number
            <= participant_rows.amount_minor % participant_rows.participant_count
          then 1
          else 0
        end
  from participant_rows;

  insert into public.settlements as current_settlement (
    group_id,
    id,
    from_member_id,
    to_member_id,
    amount_minor,
    settlement_date,
    notes
  )
  select
    p_group_id,
    settlement.value->>'id',
    settlement.value->>'fromMemberId',
    settlement.value->>'toMemberId',
    (settlement.value->>'amountMinor')::bigint,
    (settlement.value->>'date')::date,
    settlement.value->>'notes'
  from jsonb_array_elements(p_data->'settlements') as settlement(value)
  on conflict (group_id, id) do update set
    from_member_id = excluded.from_member_id,
    to_member_id = excluded.to_member_id,
    amount_minor = excluded.amount_minor,
    settlement_date = excluded.settlement_date,
    notes = excluded.notes,
    updated_at = now()
  where (
    current_settlement.from_member_id,
    current_settlement.to_member_id,
    current_settlement.amount_minor,
    current_settlement.settlement_date,
    current_settlement.notes
  ) is distinct from (
    excluded.from_member_id,
    excluded.to_member_id,
    excluded.amount_minor,
    excluded.settlement_date,
    excluded.notes
  );

  delete from public.settlements
  where group_id = p_group_id
    and not exists (
      select 1
      from jsonb_array_elements(p_data->'settlements') as settlement(value)
      where settlement.value->>'id' = public.settlements.id
    );

  delete from public.expenses
  where group_id = p_group_id
    and not exists (
      select 1
      from jsonb_array_elements(p_data->'expenses') as expense(value)
      where expense.value->>'id' = public.expenses.id
    );

  delete from public.group_people
  where group_id = p_group_id
    and not exists (
      select 1
      from jsonb_array_elements(p_data->'members') as member(value)
      where member.value->>'id' = public.group_people.member_id
    );
end;
$$;

create or replace function public.sync_shared_group_financial_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_group_financial_data(new.id, new.data);
  return new;
end;
$$;

insert into public.groups (
  id,
  owner_id,
  name,
  category,
  location,
  description,
  created_at,
  updated_at
)
select
  shared_group.id,
  shared_group.owner_id,
  shared_group.data->>'name',
  shared_group.data->>'category',
  shared_group.data->>'location',
  shared_group.data->>'description',
  shared_group.created_at,
  shared_group.updated_at
from public.shared_groups as shared_group
on conflict (id) do nothing;

alter table public.group_members
  drop constraint if exists group_members_group_id_fkey;

alter table public.group_members
  add constraint group_members_group_id_fkey
  foreign key (group_id) references public.groups (id) on delete cascade;

drop trigger if exists shared_groups_00_sync_group_metadata on public.shared_groups;
create trigger shared_groups_00_sync_group_metadata
  after insert or update of data on public.shared_groups
  for each row execute function public.sync_group_metadata();

drop trigger if exists shared_groups_sync_financial_data on public.shared_groups;
create trigger shared_groups_sync_financial_data
  after insert or update of data on public.shared_groups
  for each row execute function public.sync_shared_group_financial_data();

select public.sync_group_financial_data(shared_group.id, shared_group.data)
from public.shared_groups as shared_group;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_people enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.groups from anon, authenticated;
revoke all on table public.group_people from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
revoke all on table public.expense_splits from anon, authenticated;
revoke all on table public.settlements from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.groups to authenticated;
grant select on table public.group_people to authenticated;
grant select on table public.expenses to authenticated;
grant select on table public.expense_splits to authenticated;
grant select on table public.settlements to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Group members can read groups" on public.groups;
create policy "Group members can read groups"
  on public.groups
  for select
  to authenticated
  using ((select public.is_group_member(id)));

drop policy if exists "Group members can read group people" on public.group_people;
create policy "Group members can read group people"
  on public.group_people
  for select
  to authenticated
  using ((select public.is_group_member(group_id)));

drop policy if exists "Group members can read expenses" on public.expenses;
create policy "Group members can read expenses"
  on public.expenses
  for select
  to authenticated
  using ((select public.is_group_member(group_id)));

drop policy if exists "Group members can read expense splits" on public.expense_splits;
create policy "Group members can read expense splits"
  on public.expense_splits
  for select
  to authenticated
  using ((select public.is_group_member(group_id)));

drop policy if exists "Group members can read settlements" on public.settlements;
create policy "Group members can read settlements"
  on public.settlements
  for select
  to authenticated
  using ((select public.is_group_member(group_id)));

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.sync_group_metadata() from public, anon, authenticated;
revoke all on function public.sync_group_financial_data(text, jsonb) from public, anon, authenticated;
revoke all on function public.sync_shared_group_financial_data() from public, anon, authenticated;
