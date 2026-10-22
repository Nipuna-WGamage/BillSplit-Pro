import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  it("creates a demo group and updates the list", () => {
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

    expect(screen.getByRole("heading", { name: "Groups & members" })).toBeTruthy();
    expect(push).toHaveBeenCalledWith("/groups/kandy-flatmates");
  });

  it("adds a demo member and announces the change", () => {
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
      within(screen.getByRole("region", { name: /members/i })).getByText(
        "Sam Fernando",
        { exact: true },
      ),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Fernando added to Maple House.",
    );
  });

  it("prevents removing a member referenced by an expense", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Nimal Perera from Maple House" }));

    expect(screen.getByText("nimal@example.test")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "This member is referenced by an expense.",
    );
    expect(screen.queryByRole("button", { name: "Remove Nipun Perera from Maple House" })).toBeNull();
  });

  it("adds an expense with a payer and selected participants", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /description/i }), {
      target: { value: "Shared cleaning supplies" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /amount \(lkr\)/i }), {
      target: { value: "125.50" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Nipun Perera" }));
    fireEvent.click(screen.getByRole("button", { name: "Add demo expense" }));

    expect(screen.getByText("Shared cleaning supplies")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Expense added to this demo.",
    );
    expect(screen.getByText("LKR 125.50")).toBeTruthy();
  });

  it("edits and confirms deletion of an expense", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Weekly groceries" }));
    fireEvent.change(screen.getByRole("textbox", { name: /amount \(lkr\)/i }), {
      target: { value: "9999.99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("LKR 9,999.99")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Expense updated");

    fireEvent.click(screen.getByRole("button", { name: "Delete Wi-Fi bill" }));
    expect(
      screen.getByRole("group", { name: "Confirm removing Wi-Fi bill" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.queryByText("Wi-Fi bill")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Expense removed");
  });
});
