import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

    expect(screen.getByText("Sam Fernando")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Sam Fernando added to Maple House.",
    );
  });

  it("removes a regular demo member and protects the group admin", () => {
    render(
      <GroupProvider>
        <GroupDetailPage groupId="maple-house" />
      </GroupProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Nimal Perera from Maple House" }));

    expect(screen.queryByText("nimal@example.test")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Nimal Perera removed from Maple House.",
    );
    expect(screen.queryByRole("button", { name: "Remove Nipun Perera from Maple House" })).toBeNull();
  });
});
