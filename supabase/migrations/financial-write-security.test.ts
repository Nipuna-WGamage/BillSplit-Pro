import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261026100000_harden_financial_writes.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");
const groupCreationPolicyMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261026120000_allow_group_owners_to_read_new_groups.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

describe("financial database write security migration", () => {
  it("validates stored group data before computing financial state", () => {
    expect(migration).toContain(
      "if not public.is_valid_group_data(p_data) then",
    );
    expect(migration).toContain("split_total <> amount");
    expect(migration).toContain("participant_number <= mod(amount, participant_count)");
    expect(migration).toContain("abs(balances[member_index]) > 9007199254740991");
  });

  it("applies financial validation to inserts and every shared-group update", () => {
    expect(migration).toContain(
      "create or replace function public.validate_shared_group_data()",
    );
    expect(migration).toContain(
      "or not public.is_valid_group_financial_state(new.data)",
    );
    expect(migration).toContain(
      "before insert or update of data on public.shared_groups",
    );
    expect(migration).toContain(
      "where not public.is_valid_group_financial_state(shared_group.data)",
    );
  });

  it("checks every settlement against sequential outstanding balances", () => {
    expect(migration).toContain("balances[from_index] >= 0");
    expect(migration).toContain("balances[to_index] <= 0");
    expect(migration).toContain(
      "amount > least(abs(balances[from_index]), balances[to_index])",
    );
    expect(migration).toContain(
      "order by payment.ordinality",
    );
  });

  it("authorizes writes under a group row lock and rejects stale versions", () => {
    expect(migration).toContain("if (select auth.uid()) is null then");
    expect(migration).toContain("where id = p_group_id\n  for update;");
    expect(migration).toContain("not public.is_group_member(p_group_id)");
    expect(migration).toContain(
      "current_group.updated_at is distinct from p_expected_updated_at",
    );
  });

  it("allows a group owner to read the inserted row returned by group creation", () => {
    expect(groupCreationPolicyMigration).toContain(
      'drop policy if exists "Group members can read shared groups"',
    );
    expect(groupCreationPolicyMigration).toContain(
      'create policy "Group members and owners can read shared groups"',
    );
    expect(groupCreationPolicyMigration).toContain(
      "owner_id = (select auth.uid())",
    );
    expect(groupCreationPolicyMigration).toContain(
      "or (select public.is_group_member(id))",
    );
  });

  it("protects settlement and settled-expense history from direct RPC edits", () => {
    expect(migration).toContain("Settled expenses cannot be changed or removed.");
    expect(migration).toContain("Expenses cannot be changed while settlement history exists.");
    expect(migration).toContain("Settlement history is append-only.");
    expect(migration).toContain("Only the most recent settlement can be undone.");
  });

  it("does not expose validation helpers or grant writes beyond the authorized RPC", () => {
    expect(migration).toContain(
      "revoke all on function public.is_valid_group_financial_state(jsonb)\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "revoke all on function public.validate_shared_group_data()\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "revoke all on function public.save_group_data(text, jsonb, timestamptz)\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.save_group_data(text, jsonb, timestamptz)\n  to authenticated;",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete|all)\s+on\s+table\s+public\.(?:expenses|expense_splits|settlements)\s+to\s+authenticated/i,
    );
  });
});
