import { describe, expect, it } from "vitest";
import { calculateGroupBalances, splitExpenseEqually } from "./balances";
import type { GroupExpense } from "./expenses";
import type { GroupMember } from "./groups";

const members: GroupMember[] = [
  { id: "alice", name: "Alice", email: "alice@example.test", role: "Admin" },
  { id: "bob", name: "Bob", email: "bob@example.test", role: "Member" },
  { id: "cara", name: "Cara", email: "cara@example.test", role: "Member" },
];

function expense(
  overrides: Partial<GroupExpense> = {},
): GroupExpense {
  return {
    id: "expense-1",
    description: "Shared lunch",
    category: "Other",
    amountMinor: 100,
    paidByMemberId: "alice",
    date: "2026-10-22",
    notes: "",
    participantMemberIds: ["alice", "bob", "cara"],
    settled: false,
    ...overrides,
  };
}

describe("equal expense allocation", () => {
  it("splits minor units evenly and assigns any remainder by member ID", () => {
    const shares = splitExpenseEqually(100, ["cara", "alice", "bob"]);

    expect(shares).toEqual([
      { memberId: "alice", amountMinor: 34 },
      { memberId: "bob", amountMinor: 33 },
      { memberId: "cara", amountMinor: 33 },
    ]);
    expect(shares.reduce((total, share) => total + share.amountMinor, 0)).toBe(100);
  });

  it("rejects invalid amounts and participant lists", () => {
    expect(() => splitExpenseEqually(0, ["alice"])).toThrow(RangeError);
    expect(() => splitExpenseEqually(10, [])).toThrow(RangeError);
    expect(() => splitExpenseEqually(10, ["alice", "alice"])).toThrow(RangeError);
  });
});

describe("group balance calculation", () => {
  it("credits the payer and debits each participant's equal share", () => {
    expect(
      calculateGroupBalances(members, [
        expense({ amountMinor: 100, participantMemberIds: ["alice", "bob", "cara"] }),
      ]),
    ).toEqual([
      { memberId: "alice", balanceMinor: 66 },
      { memberId: "bob", balanceMinor: -33 },
      { memberId: "cara", balanceMinor: -33 },
    ]);
  });

  it("supports a payer who is not included in the expense", () => {
    expect(
      calculateGroupBalances(
        members,
        [
          expense({
            amountMinor: 90,
            paidByMemberId: "alice",
            participantMemberIds: ["bob", "cara"],
          }),
        ],
      ),
    ).toEqual([
      { memberId: "alice", balanceMinor: 90 },
      { memberId: "bob", balanceMinor: -45 },
      { memberId: "cara", balanceMinor: -45 },
    ]);
  });

  it("omits expenses already marked settled", () => {
    expect(
      calculateGroupBalances(members, [expense({ settled: true })]),
    ).toEqual(members.map((member) => ({ memberId: member.id, balanceMinor: 0 })));
  });

  it("rejects expenses with references outside the group", () => {
    expect(() =>
      calculateGroupBalances(
        members,
        [expense({ paidByMemberId: "outsider" })],
      ),
    ).toThrow("Expense payer must belong to the group.");
    expect(() =>
      calculateGroupBalances(
        members,
        [expense({ participantMemberIds: ["outsider"] })],
      ),
    ).toThrow("Expense participants must belong to the group.");
  });
});
