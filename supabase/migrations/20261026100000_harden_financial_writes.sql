create or replace function public.is_valid_group_financial_state(p_data jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_ids text[];
  balances numeric[];
  member_index integer;
  payer_index integer;
  from_index integer;
  to_index integer;
  participant_count integer;
  participant_number integer;
  participant_id text;
  item jsonb;
  settlement jsonb;
  amount numeric;
  share_amount numeric;
  split_total numeric;
  total_balance numeric := 0;
begin
  if not public.is_valid_group_data(p_data) then
    return false;
  end if;

  select array_agg(member.value->>'id' order by member.ordinality)
  into member_ids
  from jsonb_array_elements(p_data->'members') with ordinality
    as member(value, ordinality);

  if member_ids is null then
    return false;
  end if;

  balances := array_fill(0::numeric, array[cardinality(member_ids)]);

  for item in
    select expense.value
    from jsonb_array_elements(p_data->'expenses') as expense(value)
  loop
    if (item->>'settled')::boolean then
      continue;
    end if;

    amount := (item->>'amountMinor')::numeric;
    payer_index := array_position(member_ids, item->>'paidByMemberId');

    if payer_index is null then
      return false;
    end if;

    balances[payer_index] := balances[payer_index] + amount;

    select count(*)::integer
    into participant_count
    from jsonb_array_elements_text(item->'participantMemberIds');

    if participant_count < 1 then
      return false;
    end if;

    participant_number := 0;
    split_total := 0;

    for participant_id in
      select participant.member_id
      from jsonb_array_elements_text(item->'participantMemberIds')
        as participant(member_id)
      order by participant.member_id collate "C"
    loop
      member_index := array_position(member_ids, participant_id);
      participant_number := participant_number + 1;
      share_amount := trunc(amount / participant_count);

      if participant_number <= mod(amount, participant_count) then
        share_amount := share_amount + 1;
      end if;

      if member_index is null then
        return false;
      end if;

      split_total := split_total + share_amount;
      balances[member_index] := balances[member_index] - share_amount;
    end loop;

    if split_total <> amount or participant_number <> participant_count then
      return false;
    end if;
  end loop;

  for settlement in
    select payment.value
    from jsonb_array_elements(p_data->'settlements') with ordinality
      as payment(value, ordinality)
    order by payment.ordinality
  loop
    from_index := array_position(member_ids, settlement->>'fromMemberId');
    to_index := array_position(member_ids, settlement->>'toMemberId');
    amount := (settlement->>'amountMinor')::numeric;

    if from_index is null
      or to_index is null
      or from_index = to_index
      or balances[from_index] >= 0
      or balances[to_index] <= 0
      or amount > least(abs(balances[from_index]), balances[to_index]) then
      return false;
    end if;

    balances[from_index] := balances[from_index] + amount;
    balances[to_index] := balances[to_index] - amount;
  end loop;

  for member_index in 1..cardinality(member_ids)
  loop
    if abs(balances[member_index]) > 9007199254740991 then
      return false;
    end if;

    total_balance := total_balance + balances[member_index];
  end loop;

  return total_balance = 0;
end;
$$;

revoke all on function public.is_valid_group_financial_state(jsonb)
  from public, anon, authenticated;

create or replace function public.validate_shared_group_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.data->>'id' is distinct from new.id
    or not public.is_valid_group_data(new.data)
    or not public.is_valid_group_financial_state(new.data) then
    raise exception 'The saved group data or its financial balances are invalid.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_shared_group_data()
  from public, anon, authenticated;

drop trigger if exists shared_groups_validate_data on public.shared_groups;
create trigger shared_groups_validate_data
  before insert or update of data on public.shared_groups
  for each row execute function public.validate_shared_group_data();

do $$
begin
  if exists (
    select 1
    from public.shared_groups as shared_group
    where not public.is_valid_group_financial_state(shared_group.data)
  ) then
    raise exception 'Existing group data contains invalid financial balances. Correct it before applying this migration.';
  end if;
end;
$$;

create or replace function public.save_group_data(
  p_group_id text,
  p_data jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_group public.shared_groups%rowtype;
  owner_member_id text;
  existing_settlement_count integer;
  requested_settlement_count integer;
  existing_settlement_prefix jsonb;
  requested_settlement_prefix jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in before saving group changes.';
  end if;

  select *
  into current_group
  from public.shared_groups
  where id = p_group_id
  for update;

  if not found or not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group.';
  end if;

  if current_group.updated_at is distinct from p_expected_updated_at then
    raise exception 'This group has changed since it was loaded. Refresh before saving to avoid overwriting another member''s changes.';
  end if;

  if p_data->>'id' is distinct from p_group_id
    or not public.is_valid_group_data(p_data)
    or not public.is_valid_group_financial_state(p_data) then
    raise exception 'The group data or its financial balances are invalid.';
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

  if exists (
    select 1
    from jsonb_array_elements(current_group.data->'expenses') as old_expense(value)
    where old_expense.value->>'settled' = 'true'
      and not exists (
        select 1
        from jsonb_array_elements(p_data->'expenses') as new_expense(value)
        where new_expense.value = old_expense.value
      )
  ) or exists (
    select 1
    from jsonb_array_elements(p_data->'expenses') as new_expense(value)
    where new_expense.value->>'settled' = 'true'
      and not exists (
        select 1
        from jsonb_array_elements(current_group.data->'expenses') as old_expense(value)
        where old_expense.value = new_expense.value
      )
  ) then
    raise exception 'Settled expenses cannot be changed or removed.';
  end if;

  if (p_data->'expenses') is distinct from (current_group.data->'expenses')
    and (
      jsonb_array_length(p_data->'settlements') > 0
      or jsonb_array_length(current_group.data->'settlements') > 0
    ) then
    raise exception 'Expenses cannot be changed while settlement history exists. Undo settlements first.';
  end if;

  existing_settlement_count :=
    jsonb_array_length(current_group.data->'settlements');
  requested_settlement_count := jsonb_array_length(p_data->'settlements');

  if p_data->'settlements' is distinct from current_group.data->'settlements' then
    select coalesce(jsonb_agg(payment.value order by payment.ordinality), '[]'::jsonb)
    into requested_settlement_prefix
    from jsonb_array_elements(p_data->'settlements') with ordinality
      as payment(value, ordinality)
    where payment.ordinality <= existing_settlement_count;

    if requested_settlement_count = existing_settlement_count + 1 then
      if requested_settlement_prefix
        is distinct from current_group.data->'settlements' then
        raise exception 'Settlement history is append-only.';
      end if;
    elsif existing_settlement_count = requested_settlement_count + 1 then
      select coalesce(jsonb_agg(payment.value order by payment.ordinality), '[]'::jsonb)
      into existing_settlement_prefix
      from jsonb_array_elements(current_group.data->'settlements') with ordinality
        as payment(value, ordinality)
      where payment.ordinality <= requested_settlement_count;

      if existing_settlement_prefix is distinct from p_data->'settlements' then
        raise exception 'Only the most recent settlement can be undone.';
      end if;
    else
      raise exception 'Settlement history can only add one payment or undo the most recent payment.';
    end if;
  end if;

  update public.shared_groups
  set data = p_data, updated_at = now()
  where id = p_group_id
  returning updated_at into current_group.updated_at;

  return current_group.updated_at;
end;
$$;

revoke all on function public.save_group_data(text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.save_group_data(text, jsonb, timestamptz)
  to authenticated;
