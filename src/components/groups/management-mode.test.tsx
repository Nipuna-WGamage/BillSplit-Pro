import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialDemoGroups } from "@/lib/groups";
import { ExpenseManagement } from "./expense-management";
import { SettlementManagement } from "./settlement-management";

const { useGroups } = vi.hoisted(() => ({
  useGroups: vi.fn(),
}));

vi.mock("./group-provider", () => ({ useGroups }));

afterEach(() => cleanup());

beforeEach(() => {
  useGroups.mockReset();
});

describe("management screens in Supabase mode", () => {
  it("shows saved expense messaging and reports a successful save", async () => {
    const group = initialDemoGroups[0];
    useGroups.mockReturnValue({
      groups: [group],
      createExpense: vi.fn().mockResolvedValue({ success: true, value: group }),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      isSupabaseMode: true,
    });

    render(<ExpenseManagement groupId={group.id} />);

    expect(
      screen.getByText(
        "Track who paid and who is included. Expenses are saved to this shared group.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Changes are saved to this shared group."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save expense" })).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: /description/i }), {
      target: { value: "Cleaning supplies" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /amount \(lkr\)/i }), {
      target: { value: "125.50" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Nipun Perera" }));
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Expense saved to this group.",
    );
  });

  it("shows settlement labels and reports saved balances", async () => {
    const group = initialDemoGroups[0];
    useGroups.mockReturnValue({
      groups: [group],
      createSettlement: vi.fn().mockResolvedValue({
        success: true,
        value: group,
      }),
      deleteSettlement: vi.fn(),
      isSupabaseMode: true,
    });

    render(<SettlementManagement groupId={group.id} />);

    expect(screen.getByText("SAVED")).toBeTruthy();
    expect(
      screen.getByText(
        "Record money paid between members to update shared group balances. No money is transferred by this app.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("No settlements recorded yet.")).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: /amount \(lkr\)/i }), {
      target: { value: "100.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record settlement" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Settlement saved and group balances updated.",
    );
  });

  it("surfaces database save errors to the user", async () => {
    const group = initialDemoGroups[0];
    useGroups.mockReturnValue({
      groups: [group],
      createSettlement: vi.fn().mockResolvedValue({
        success: false,
        error: "Could not save your group changes. Database unavailable.",
      }),
      deleteSettlement: vi.fn(),
      isSupabaseMode: true,
    });

    render(<SettlementManagement groupId={group.id} />);

    fireEvent.change(screen.getByRole("textbox", { name: /amount \(lkr\)/i }), {
      target: { value: "100.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record settlement" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not save your group changes. Database unavailable.",
    );
  });
});
