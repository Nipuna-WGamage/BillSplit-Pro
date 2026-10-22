import { describe, expect, it } from "vitest";
import { calculateGroupBalances } from "./balances";
import type { GroupExpense } from "./expenses";
import type { GroupMember } from "./groups";
import { createSettlement, deleteSettlement } from "./settlements";

const members: GroupMember[] = [
  { id: "alice", name: "Alice", email: "alice@example.test", role: "Admin" },
  { id: "bob", name: "Bob", email: "bob@example.test", role: "Member" },
  { id: "cara", name: "Cara", email: "cara@example.test", role: "Member" },
];

const expenses: GroupExpense[] = [
  {
    id: "expense-1",
    description: "Shared meal",
    category: "Other",
    amountMinor: 900,
    paidByMemberId: "alice",
    date: "2026-10-20",
    notes: "",
    participantMemberIds: ["alice", "bob", "cara"],
    settled: false,
  },
];

const balances = calculateGroupBalances(members, expenses);
const validInput = {
  fromMemberId: "bob",
  toMemberId: "alice",
  amount: "2.00",
  date: "2026-10-20",
  notes: "",
};

describe("demo settlements", () => {
  it("records a partial payment and applies it to both members' balances", () => {
    const result = createSettlement(validInput, members, balances);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value).toMatchObject({
      fromMemberId: "bob",
      toMemberId: "alice",
      amountMinor: 200,
      date: "2026-10-20",
    });
    expect(
      calculateGroupBalances(members, expenses, [result.value]),
    ).toEqual([
      { memberId: "alice", balanceMinor: 400 },
      { memberId: "bob", balanceMinor: -100 },
      { memberId: "cara", balanceMinor: -300 },
    ]);
  });

  it("rejects invalid directions, self-payments, and payments beyond either balance", () => {
    expect(
      createSettlement(
        { ...validInput, fromMemberId: "alice", toMemberId: "bob" },
        members,
        balances,
      ),
    ).toMatchObject({ success: false, error: "Choose a member who owes and a member who is owed." });
    expect(
      createSettlement(
        { ...validInput, toMemberId: "bob" },
        members,
        balances,
      ),
    ).toMatchObject({ success: false, error: "A member cannot pay themselves." });
    expect(
      createSettlement({ ...validInput, amount: "3.01" }, members, balances),
    ).toMatchObject({
      success: false,
      error: "Settlement cannot exceed the amount the payer owes or the recipient is owed.",
    });
  });

  it("validates amount, date, and note length", () => {
    expect(
      createSettlement({ ...validInput, amount: "0" }, members, balances),
    ).toMatchObject({
      success: false,
      error: "Enter a positive amount with no more than two decimal places.",
    });
    expect(
      createSettlement({ ...validInput, date: "2026-02-30" }, members, balances),
    ).toMatchObject({ success: false, error: "Enter a valid settlement date." });
    expect(
      createSettlement({ ...validInput, notes: "x".repeat(251) }, members, balances),
    ).toMatchObject({
      success: false,
      error: "Keep settlement notes to 250 characters or fewer.",
    });
  });

  it("removes a recorded settlement for undo", () => {
    const result = createSettlement(validInput, members, balances);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(deleteSettlement(result.value.id, [result.value])).toMatchObject({
      success: true,
      value: [],
    });
    expect(deleteSettlement("missing", [result.value])).toMatchObject({
      success: false,
      error: "This settlement could not be found.",
    });
  });

  it("requires later payments to be undone before earlier ones", () => {
    const first = createSettlement(validInput, members, balances);
    expect(first.success).toBe(true);
    if (!first.success) return;

    const afterFirst = calculateGroupBalances(members, expenses, [first.value]);
    const second = createSettlement(
      { ...validInput, amount: "1.00" },
      members,
      afterFirst,
    );
    expect(second.success).toBe(true);
    if (!second.success) return;

    expect(
      deleteSettlement(first.value.id, [first.value, second.value]),
    ).toMatchObject({
      success: false,
      error: "Undo the most recent settlement first.",
    });
    expect(
      deleteSettlement(second.value.id, [first.value, second.value]),
    ).toMatchObject({ success: true, value: [first.value] });
  });

  it("rejects settlements with members outside the group", () => {
    expect(() =>
      calculateGroupBalances(members, expenses, [
        {
          id: "invalid-settlement",
          fromMemberId: "outsider",
          toMemberId: "alice",
          amountMinor: 100,
          date: "2026-10-20",
          notes: "",
        },
      ]),
    ).toThrow("Settlement members must belong to the group.");
  });
});
