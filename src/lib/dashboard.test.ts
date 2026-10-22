import { describe, expect, it } from "vitest";
import { calculateDashboardUserBalance } from "./dashboard";
import { initialDemoGroups } from "./groups";

describe("dashboard user balance", () => {
  it("uses the signed-in member identity across shared groups", () => {
    const groups = [
      {
        ...initialDemoGroups[0],
        members: initialDemoGroups[0].members.map((member) =>
          member.email === "nipun@example.test"
            ? { ...member, email: "admin@example.test" }
            : member,
        ),
      },
      {
        ...initialDemoGroups[1],
        members: initialDemoGroups[1].members.map((member) =>
          member.email === "nipun@example.test"
            ? { ...member, email: "admin@example.test" }
            : member,
        ),
      },
    ];

    const adminBalance = calculateDashboardUserBalance(
      groups,
      " ADMIN@example.test ",
      false,
    );
    const otherMemberBalance = calculateDashboardUserBalance(
      groups,
      "nimal@example.test",
      false,
    );

    expect(adminBalance).toEqual({ balanceMinor: 364000, groupCount: 2 });
    expect(otherMemberBalance).toEqual({ balanceMinor: 85000, groupCount: 2 });
  });

  it("uses the demo admin fallback only in demo mode", () => {
    expect(
      calculateDashboardUserBalance(initialDemoGroups, "", true),
    ).toEqual({ balanceMinor: 294000, groupCount: 3 });
    expect(
      calculateDashboardUserBalance(initialDemoGroups, "", false),
    ).toEqual({ balanceMinor: 0, groupCount: 0 });
  });
});
