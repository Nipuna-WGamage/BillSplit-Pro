import { calculateGroupBalances } from "./balances";
import type { DemoGroup } from "./groups";

export type DashboardUserBalance = {
  balanceMinor: number;
  groupCount: number;
};

export function calculateDashboardUserBalance(
  groups: DemoGroup[],
  email: string,
  useDemoAdminFallback: boolean,
): DashboardUserBalance {
  const normalizedEmail = email.trim().toLocaleLowerCase();
  let balanceMinor = 0;
  let groupCount = 0;

  for (const group of groups) {
    const member = normalizedEmail
      ? group.members.find(
          (candidate) =>
            candidate.email.trim().toLocaleLowerCase() === normalizedEmail,
        )
      : useDemoAdminFallback
        ? group.members.find((candidate) => candidate.role === "Admin")
        : undefined;

    if (!member) {
      continue;
    }

    const memberBalance = calculateGroupBalances(
      group.members,
      group.expenses,
      group.settlements,
    ).find((balance) => balance.memberId === member.id)?.balanceMinor ?? 0;

    balanceMinor += memberBalance;
    if (memberBalance !== 0) {
      groupCount += 1;
    }
  }

  return { balanceMinor, groupCount };
}
