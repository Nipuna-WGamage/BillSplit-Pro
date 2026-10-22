import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupDetailPage } from "./group-detail-page";
import { GroupProvider } from "./group-provider";
import { GroupsPage } from "./groups-page";

const push = vi.fn();

vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("group management screens", () => {
  it("creates a demo group and updates the list", async () => {
    render(
      <GroupProvider>
        <GroupsPage />
      </GroupProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /group name/i }), {
      target: { value: "Kandy Flatmates" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /location or short note/i }), {
      target: { value: "Kandy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create demo group" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Groups & members" })).toBeTruthy();
      expect(push).toHaveBeenCalledWith("/groups/kandy-flatmates");
    });
  });

  it("adds a demo member and announces the change", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /full name/i }), {
      target: { value: "Sam Fernando" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /email address/i }), {
      target: { value: "sam@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add demo member/i }));

    expect(
      await within(screen.getByRole("region", { name: /members/i })).findByText(
        "Sam Fernando",
        { exact: true },
      ),
    ).toBeTruthy();
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Sam Fernando added to Maple House.");
  });

  it("prevents removing a member referenced by an expense", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Nimal Perera from Maple House" }));

    expect(await screen.findByText("nimal@example.test")).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "This member is referenced by an expense.",
    );
    expect(screen.queryByRole("button", { name: "Remove Nipun Perera from Maple House" })).toBeNull();
  });

  it("shows per-member balances calculated from equal expense shares", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    const balances = screen.getByRole("region", { name: "Member balances" });

    expect(within(balances).getByText("Owed LKR 5,290.00")).toBeTruthy();
    expect(within(balances).getByText("Owed LKR 1,030.00")).toBeTruthy();
    expect(within(balances).getAllByText("Owes LKR 3,160.00")).toHaveLength(2);
  });

  it("shows the precise equal share for each expense participant", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getAllByText("View equal split")[0]);

    expect(screen.getAllByText("LKR 2,112.50")).toHaveLength(4);
  });

  it("records a partial payment and updates balances and payment history", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(
      within(screen.getByRole("region", { name: "Settlements" })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      {
        target: { value: "100.00" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Record demo settlement" }));

    await screen.findByText("Settlement recorded in this demo.");
    const balancePanel = screen.getByRole("region", { name: "Member balances" });
    expect(within(balancePanel).getByText("Owed LKR 5,190.00")).toBeTruthy();
    expect(within(balancePanel).getByText("Owes LKR 3,060.00")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Settlement recorded in this demo.",
    );
    expect(screen.getByText("LKR 100.00")).toBeTruthy();
  });

  it("allows undoing a settlement and recalculates group balances", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(
      within(screen.getByRole("region", { name: "Settlements" })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      { target: { value: "100.00" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Record demo settlement" }));
    await screen.findByRole("button", { name: "Remove settlement of LKR 100.00" });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove settlement of LKR 100.00" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await screen.findByText("Settlement removed from this demo and balances recalculated.");
    const balancePanel = screen.getByRole("region", { name: "Member balances" });
    expect(within(balancePanel).getByText("Owed LKR 5,290.00")).toBeTruthy();
    expect(within(balancePanel).getAllByText("Owes LKR 3,160.00")).toHaveLength(2);
    expect(screen.getByText("No demo payments recorded yet.")).toBeTruthy();
  });

  it("protects expense history from edits after a settlement is recorded", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(
      within(screen.getByRole("region", { name: "Settlements" })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      { target: { value: "100.00" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Record demo settlement" }));
    await screen.findByText("Settlement recorded in this demo.");
    fireEvent.click(screen.getByRole("button", { name: "Edit Weekly groceries" }));
    fireEvent.change(
      within(screen.getByRole("region", { name: /expenses/i })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      { target: { value: "9999.99" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Expenses cannot be edited after a settlement is recorded.",
    );
    expect(screen.getByText("LKR 8,450.00")).toBeTruthy();
  });

  it("adds an expense with a payer and selected participants", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /description/i }), {
      target: { value: "Shared cleaning supplies" },
    });
    fireEvent.change(
      within(screen.getByRole("region", { name: /expenses/i })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      { target: { value: "125.50" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Nipun Perera" }));
    fireEvent.click(screen.getByRole("button", { name: "Add demo expense" }));

    expect(await screen.findByText("Shared cleaning supplies")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Expense added to this demo.");
    expect(screen.getAllByText("LKR 125.50")).toHaveLength(2);
  });

  it("edits and confirms deletion of an expense", async () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Weekly groceries" }));
    fireEvent.change(
      within(screen.getByRole("region", { name: /expenses/i })).getByRole(
        "textbox",
        { name: /amount \(lkr\)/i },
      ),
      { target: { value: "9999.99" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("LKR 9,999.99")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Expense updated");

    fireEvent.click(screen.getByRole("button", { name: "Delete Wi-Fi bill" }));
    expect(
      screen.getByRole("group", { name: "Confirm removing Wi-Fi bill" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.queryByText("Wi-Fi bill")).toBeNull());
    expect((await screen.findByRole("status")).textContent).toContain("Expense removed");
  });
});
