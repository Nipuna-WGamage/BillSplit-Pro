import type { MemberBalance } from "./balances";
import { parseLkrMinorUnits } from "./expenses";
import type { GroupMember } from "./groups";

export type GroupSettlement = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  date: string;
  notes: string;
};

export type SettlementInput = {
  fromMemberId: string;
  toMemberId: string;
  amount: string;
  date: string;
  notes: string;
};

export type SettlementResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

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

export function createSettlement(
  input: SettlementInput,
  members: GroupMember[],
  balances: MemberBalance[],
): SettlementResult<GroupSettlement> {
  const fromMember = members.find((member) => member.id === input.fromMemberId);
  const toMember = members.find((member) => member.id === input.toMemberId);

  if (!fromMember || !toMember) {
    return { success: false, error: "Choose both members from this group." };
  }

  if (fromMember.id === toMember.id) {
    return { success: false, error: "A member cannot pay themselves." };
  }

  const fromBalance = balances.find(
    (balance) => balance.memberId === fromMember.id,
  )?.balanceMinor;
  const toBalance = balances.find(
    (balance) => balance.memberId === toMember.id,
  )?.balanceMinor;

  if (fromBalance === undefined || fromBalance >= 0 || toBalance === undefined || toBalance <= 0) {
    return {
      success: false,
      error: "Choose a member who owes and a member who is owed.",
    };
  }

  const amountMinor = parseLkrMinorUnits(input.amount);

  if (amountMinor === null) {
    return {
      success: false,
      error: "Enter a positive amount with no more than two decimal places.",
    };
  }

  if (amountMinor > Math.min(Math.abs(fromBalance), toBalance)) {
    return {
      success: false,
      error: "Settlement cannot exceed the amount the payer owes or the recipient is owed.",
    };
  }

  if (!isValidDate(input.date)) {
    return { success: false, error: "Enter a valid settlement date." };
  }

  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (input.date > todayIso) {
    return { success: false, error: "Settlement date cannot be in the future." };
  }

  const notes = input.notes.trim();

  if (notes.length > 250) {
    return { success: false, error: "Keep settlement notes to 250 characters or fewer." };
  }

  return {
    success: true,
    value: {
      id: `settlement-${Date.now().toString(36)}-${crypto.randomUUID()}`,
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amountMinor,
      date: input.date,
      notes,
    },
  };
}

export function deleteSettlement(
  settlementId: string,
  existingSettlements: GroupSettlement[],
): SettlementResult<GroupSettlement[]> {
  const settlementIndex = existingSettlements.findIndex(
    (settlement) => settlement.id === settlementId,
  );

  if (settlementIndex === -1) {
    return { success: false, error: "This settlement could not be found." };
  }

  if (settlementIndex !== existingSettlements.length - 1) {
    return {
      success: false,
      error: "Undo the most recent settlement first.",
    };
  }

  return {
    success: true,
    value: existingSettlements.filter(
      (settlement) => settlement.id !== settlementId,
    ),
  };
}
