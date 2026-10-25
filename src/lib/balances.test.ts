import { describe, expect, it } from "vitest";
import { calculateGroupBalances, splitExpenseEqually } from "./balances";
import type { GroupExpense } from "./expenses";
import type { GroupMember } from "./groups";
import type { GroupSettlement } from "./settlements";

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

  it.each([
    [1, ["alice", "bob", "cara"]],
    [10, ["cara", "alice"]],
    [101, ["cara", "bob", "alice"]],
    [9007199254740991, ["alice"]],
  ])("allocates %i minor units exactly", (amount, participantIds) => {
    const shares = splitExpenseEqually(amount, participantIds);

    expect(shares.reduce((total, share) => total + share.amountMinor, 0))
      .toBe(amount);
    expect(shares.map((share) => share.memberId)).toEqual(
      [...participantIds].sort(),
    );
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

  it("applies each settlement once after all expenses are tallied", () => {
    const settlement: GroupSettlement = {
      id: "settlement-1",
      fromMemberId: "bob",
      toMemberId: "alice",
      amountMinor: 10,
      date: "2026-10-20",
      notes: "",
    };

    expect(
      calculateGroupBalances(
        members,
        [expense(), expense({ id: "expense-2" })],
        [settlement],
      ),
    ).toEqual([
      { memberId: "alice", balanceMinor: 122 },
      { memberId: "bob", balanceMinor: -56 },
      { memberId: "cara", balanceMinor: -66 },
    ]);
  });

  it("preserves a zero-sum balance after expenses and sequential settlements", () => {
    const testExpenses = [
      expense({ amountMinor: 101, participantMemberIds: ["alice", "bob", "cara"] }),
      expense({
        id: "expense-2",
        amountMinor: 77,
        paidByMemberId: "bob",
        participantMemberIds: ["alice", "cara"],
      }),
    ];
    const testSettlements: GroupSettlement[] = [
      {
        id: "settlement-1",
        fromMemberId: "cara",
        toMemberId: "bob",
        amountMinor: 20,
        date: "2026-10-20",
        notes: "",
      },
    ];
    const calculated = calculateGroupBalances(
      members,
      testExpenses,
      testSettlements,
    );

    expect(calculated.reduce((total, balance) => total + balance.balanceMinor, 0))
      .toBe(0);
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
