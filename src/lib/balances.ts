import type { GroupExpense } from "./expenses";
import type { GroupMember } from "./groups";

export type ExpenseShare = {
  memberId: string;
  amountMinor: number;
};

export type MemberBalance = {
  memberId: string;
  balanceMinor: number;
};

export function splitExpenseEqually(
  amountMinor: number,
  participantMemberIds: string[],
): ExpenseShare[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError("Expense amount must be a positive safe integer.");
  }

  if (
    participantMemberIds.length === 0 ||
    new Set(participantMemberIds).size !== participantMemberIds.length
  ) {
    throw new RangeError("An expense must have unique participants.");
  }

  const sortedMemberIds = [...participantMemberIds].sort((first, second) =>
    first < second ? -1 : first > second ? 1 : 0,
  );
  const baseShare = Math.floor(amountMinor / sortedMemberIds.length);
  const remainder = amountMinor % sortedMemberIds.length;

  return sortedMemberIds.map((memberId, index) => ({
    memberId,
    amountMinor: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function calculateGroupBalances(
  members: GroupMember[],
  expenses: GroupExpense[],
): MemberBalance[] {
  const balances = new Map(members.map((member) => [member.id, 0]));

  if (balances.size !== members.length) {
    throw new RangeError("Group member IDs must be unique.");
  }

  for (const expense of expenses) {
    if (expense.settled) {
      continue;
    }

    const payerBalance = balances.get(expense.paidByMemberId);

    if (payerBalance === undefined) {
      throw new RangeError("Expense payer must belong to the group.");
    }

    balances.set(
      expense.paidByMemberId,
      checkedBalance(payerBalance + expense.amountMinor),
    );

    for (const share of splitExpenseEqually(
      expense.amountMinor,
      expense.participantMemberIds,
    )) {
      const memberBalance = balances.get(share.memberId);

      if (memberBalance === undefined) {
        throw new RangeError("Expense participants must belong to the group.");
      }

      balances.set(
        share.memberId,
        checkedBalance(memberBalance - share.amountMinor),
      );
    }
  }

  return members.map((member) => ({
    memberId: member.id,
    balanceMinor: balances.get(member.id) ?? 0,
  }));
}

function checkedBalance(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Calculated group balance exceeds the safe integer range.");
  }

  return value;
}
