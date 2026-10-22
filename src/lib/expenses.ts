export const expenseCategories = [
  "Rent",
  "Electricity",
  "Water",
  "Groceries",
  "Internet",
  "Other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export type GroupExpense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountMinor: number;
  paidByMemberId: string;
  date: string;
  notes: string;
  participantMemberIds: string[];
  settled: boolean;
};

export type ExpenseInput = {
  description: string;
  category: ExpenseCategory;
  amount: string;
  paidByMemberId: string;
  date: string;
  notes: string;
  participantMemberIds: string[];
};

export type ExpenseResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export function parseLkrMinorUnits(value: string): number | null {
  const normalized = value.trim();

  if (
    normalized.length > 18 ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)
  ) {
    return null;
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const minorUnitsValue = Number(
    `${wholePart}${fractionalPart.padEnd(2, "0")}`.replace(/^0+(?=\d)/, ""),
  );

  if (!Number.isSafeInteger(minorUnitsValue) || minorUnitsValue <= 0) {
    return null;
  }

  return minorUnitsValue;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateExpenseInput(
  input: ExpenseInput,
  memberIds: string[],
): ExpenseResult<Omit<GroupExpense, "id" | "settled">> {
  const description = input.description.trim();

  if (!description) {
    return { success: false, error: "Enter a description for this expense." };
  }

  if (description.length > 100) {
    return { success: false, error: "Keep the description to 100 characters or fewer." };
  }

  if (!expenseCategories.includes(input.category)) {
    return { success: false, error: "Choose a valid expense category." };
  }

  const amountMinor = parseLkrMinorUnits(input.amount);

  if (amountMinor === null) {
    return {
      success: false,
      error: "Enter a positive amount with no more than two decimal places.",
    };
  }

  if (!memberIds.includes(input.paidByMemberId)) {
    return { success: false, error: "Choose a payer from this group." };
  }

  if (!isValidDate(input.date)) {
    return { success: false, error: "Enter a valid expense date." };
  }

  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (input.date > todayIso) {
    return { success: false, error: "Expense date cannot be in the future." };
  }

  if (input.notes.trim().length > 500) {
    return { success: false, error: "Keep notes to 500 characters or fewer." };
  }

  const participantMemberIds = [...new Set(input.participantMemberIds)];

  if (
    participantMemberIds.length === 0 ||
    participantMemberIds.some((id) => !memberIds.includes(id))
  ) {
    return {
      success: false,
      error: "Select at least one participant from this group.",
    };
  }

  return {
    success: true,
    value: {
      description,
      category: input.category,
      amountMinor,
      paidByMemberId: input.paidByMemberId,
      date: input.date,
      notes: input.notes.trim(),
      participantMemberIds,
    },
  };
}

export function createExpense(
  input: ExpenseInput,
  memberIds: string[],
): ExpenseResult<GroupExpense> {
  const validated = validateExpenseInput(input, memberIds);

  if (!validated.success) {
    return validated;
  }

  return {
    success: true,
    value: {
      ...validated.value,
      id: `expense-${Date.now().toString(36)}-${crypto.randomUUID()}`,
      settled: false,
    },
  };
}

export function updateExpense(
  expenseId: string,
  input: ExpenseInput,
  memberIds: string[],
  existingExpenses: GroupExpense[],
): ExpenseResult<GroupExpense> {
  const existing = existingExpenses.find((expense) => expense.id === expenseId);

  if (!existing) {
    return { success: false, error: "This expense could not be found." };
  }

  if (existing.settled) {
    return {
      success: false,
      error: "This expense is settled and cannot be changed.",
    };
  }

  const validated = validateExpenseInput(input, memberIds);

  if (!validated.success) {
    return validated;
  }

  return {
    success: true,
    value: { ...existing, ...validated.value },
  };
}

export function deleteExpense(
  expenseId: string,
  existingExpenses: GroupExpense[],
): ExpenseResult<GroupExpense[]> {
  const existing = existingExpenses.find((expense) => expense.id === expenseId);

  if (!existing) {
    return { success: false, error: "This expense could not be found." };
  }

  if (existing.settled) {
    return {
      success: false,
      error: "This expense is settled and cannot be deleted.",
    };
  }

  return {
    success: true,
    value: existingExpenses.filter((expense) => expense.id !== expenseId),
  };
}

export function formatLkr(amountMinor: number): string {
  return `LKR ${(amountMinor / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
