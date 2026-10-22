import { describe, expect, it } from "vitest";
import {
  addDemoGroupMember,
  createDemoGroup,
  initialDemoGroups,
  removeDemoGroupMember,
} from "./groups";

describe("demo group operations", () => {
  it("creates a trimmed group with a stable unique route id and admin", () => {
    const result = createDemoGroup(
      { name: "  Kandy Flatmates ", category: "Household", location: " Kandy " },
      initialDemoGroups,
    );

    expect(result.success).toBe(true);

    if (!result.success) return;
    expect(result.value.id).toBe("kandy-flatmates");
    expect(result.value.name).toBe("Kandy Flatmates");
    expect(result.value.location).toBe("Kandy");
    expect(result.value.members).toHaveLength(1);
    expect(result.value.members[0].role).toBe("Admin");
  });

  it("rejects a blank or duplicate group name", () => {
    expect(
      createDemoGroup({ name: "  ", category: "Other", location: "" }, initialDemoGroups),
    ).toMatchObject({ success: false, error: "Enter a name for this group." });
    expect(
      createDemoGroup({ name: "maple house", category: "Other", location: "" }, initialDemoGroups),
    ).toMatchObject({ success: false, error: "A group with this name already exists." });
  });

  it("adds a normalized member and rejects duplicate email addresses", () => {
    const group = initialDemoGroups[0];
    const added = addDemoGroupMember(group, {
      name: "  Sam Fernando ",
      email: " SAM@EXAMPLE.TEST ",
    });

    expect(added.success).toBe(true);
    if (!added.success) return;

    expect(added.value.member).toMatchObject({
      name: "Sam Fernando",
      email: "sam@example.test",
      role: "Member",
    });
    expect(added.value.group.members).toHaveLength(group.members.length + 1);
    expect(
      addDemoGroupMember(added.value.group, {
        name: "Another Sam",
        email: "sam@example.test",
      }),
    ).toMatchObject({ success: false, error: "This email is already a member of the group." });
  });

  it("rejects invalid member input", () => {
    expect(
      addDemoGroupMember(initialDemoGroups[0], { name: " ", email: "sam@example.test" }),
    ).toMatchObject({ success: false, error: "Enter the member's name." });
    expect(
      addDemoGroupMember(initialDemoGroups[0], { name: "Sam", email: "not-an-email" }),
    ).toMatchObject({ success: false, error: "Enter a valid email address." });
  });

  it("removes a regular member but protects the admin", () => {
    const group = { ...initialDemoGroups[0], expenses: [] };
    const removed = removeDemoGroupMember(group, "nimal-perera");

    expect(removed.success).toBe(true);
    if (removed.success) {
      expect(removed.value.members.some((member) => member.id === "nimal-perera")).toBe(false);
    }

    expect(removeDemoGroupMember(group, "nipun-perera")).toMatchObject({
      success: false,
      error: "The group admin cannot be removed.",
    });
  });

  it("prevents removing a member referenced by an expense", () => {
    expect(removeDemoGroupMember(initialDemoGroups[0], "nimal-perera")).toMatchObject({
      success: false,
      error: "This member is referenced by an expense. Remove or update those expenses first.",
    });
  });

  it("prevents removing a member referenced by a settlement", () => {
    const group = {
      ...initialDemoGroups[0],
      expenses: [],
      settlements: [
        {
          id: "settlement-1",
          fromMemberId: "nimal-perera",
          toMemberId: "nipun-perera",
          amountMinor: 100,
          date: "2026-10-20",
          notes: "",
        },
      ],
    };

    expect(removeDemoGroupMember(group, "nimal-perera")).toMatchObject({
      success: false,
      error: "This member is referenced by a settlement and cannot be removed.",
    });
  });
});
