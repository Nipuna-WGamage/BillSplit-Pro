import { describe, expect, it } from "vitest";
import {
  createExpense,
  deleteExpense,
  formatLkr,
  parseLkrMinorUnits,
  updateExpense,
  type ExpenseInput,
  type GroupExpense,
} from "./expenses";
import { initialDemoGroups } from "./groups";

const group = initialDemoGroups[0];
const memberIds = group.members.map((member) => member.id);

function validInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    description: "Cleaning supplies",
    category: "Other",
    amount: "125.50",
    paidByMemberId: "nipun-perera",
    date: "2026-10-20",
    notes: "",
    participantMemberIds: ["nipun-perera", "nimal-perera"],
    ...overrides,
  };
}

function createTestExpense(overrides: Partial<GroupExpense> = {}): GroupExpense {
  return {
    id: "test-expense",
    description: "Cleaning supplies",
    category: "Other",
    amountMinor: 12550,
    paidByMemberId: "nipun-perera",
    date: "2026-10-20",
    notes: "",
    participantMemberIds: ["nipun-perera", "nimal-perera"],
    settled: false,
    ...overrides,
  };
}

describe("LKR minor units", () => {
  it.each([
    ["1", 100],
    ["1.2", 120],
    ["1.23", 123],
    ["0.01", 1],
    ["123456.78", 12345678],
  ])("parses %s to %i minor units", (input, expected) => {
    expect(parseLkrMinorUnits(input)).toBe(expected);
  });

  it.each(["", "0", "0.00", "-1", "1.234", "1,000", "1e3", ".50", "01.00"])(
    "rejects invalid monetary input %s",
    (input) => {
      expect(parseLkrMinorUnits(input)).toBeNull();
    },
  );

  it("formats values without floating point rounding artifacts", () => {
    expect(formatLkr(123456)).toBe("LKR 1,234.56");
    expect(formatLkr(1)).toBe("LKR 0.01");
  });
});

describe("expense operations", () => {
  it("creates an expense in integer minor units", () => {
    const result = createExpense(validInput(), memberIds);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value).toMatchObject({
      description: "Cleaning supplies",
      category: "Other",
      amountMinor: 12550,
      paidByMemberId: "nipun-perera",
      participantMemberIds: ["nipun-perera", "nimal-perera"],
      settled: false,
    });
  });

  it.each([
    [validInput({ description: " " }), "Enter a description for this expense."],
    [validInput({ amount: "0" }), "Enter a positive amount with no more than two decimal places."],
    [validInput({ paidByMemberId: "not-a-member" }), "Choose a payer from this group."],
    [validInput({ date: "2026-02-30" }), "Enter a valid expense date."],
    [validInput({ date: "2999-01-01" }), "Expense date cannot be in the future."],
    [validInput({ participantMemberIds: [] }), "Select at least one participant from this group."],
    [validInput({ participantMemberIds: ["removed-member"] }), "Select at least one participant from this group."],
  ])("rejects invalid input with a clear error", (input, error) => {
    expect(createExpense(input, memberIds)).toMatchObject({
      success: false,
      error,
    });
  });

  it("trims fields and removes duplicate participant IDs", () => {
    const result = createExpense(
      validInput({
        description: "  Taxi  ",
        notes: "  Airport trip  ",
        participantMemberIds: ["nipun-perera", "nipun-perera"],
      }),
      memberIds,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.description).toBe("Taxi");
    expect(result.value.notes).toBe("Airport trip");
    expect(result.value.participantMemberIds).toEqual(["nipun-perera"]);
  });

  it("updates an existing expense without changing its ID", () => {
    const original = createTestExpense();
    const result = updateExpense(
      original.id,
      validInput({ description: "Updated cleaning supplies", amount: "130.00" }),
      memberIds,
      [original],
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value).toMatchObject({
      id: original.id,
      description: "Updated cleaning supplies",
      amountMinor: 13000,
      settled: false,
    });
  });

  it("deletes an existing expense", () => {
    const first = createTestExpense();
    const second = createTestExpense({ id: "another-expense" });

    expect(deleteExpense(first.id, [first, second])).toMatchObject({
      success: true,
      value: [second],
    });
  });

  it("does not edit or delete a settled expense", () => {
    const settledExpense = createTestExpense({ settled: true });

    expect(
      updateExpense(settledExpense.id, validInput(), memberIds, [settledExpense]),
    ).toMatchObject({
      success: false,
      error: "This expense is settled and cannot be changed.",
    });
    expect(deleteExpense(settledExpense.id, [settledExpense])).toMatchObject({
      success: false,
      error: "This expense is settled and cannot be deleted.",
    });
  });
});
