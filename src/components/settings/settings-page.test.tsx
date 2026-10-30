import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./settings-page";

const mocks = vi.hoisted(() => ({
  useGroups: vi.fn(),
}));

vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/groups/group-provider", () => ({
  useGroups: mocks.useGroups,
}));
vi.mock("@/components/auth/account-controls", () => ({
  AccountControls: () => <div data-testid="account-controls" />,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settings page", () => {
  it("shows account, currency, access, and password options for a signed-in user", () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "member@example.com",
    });

    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("member@example.com")).toBeTruthy();
    expect(screen.getByText("Sri Lankan Rupee")).toBeTruthy();
    expect(screen.getByRole("link", { name: /manage groups/i }).getAttribute("href"))
      .toBe("/groups");
    expect(screen.getByRole("link", { name: /reset password/i }).getAttribute("href"))
      .toBe("/forgot-password");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("explains demo mode and links to sign in or create an account", () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: false,
      userEmail: "",
    });

    render(<SettingsPage />);

    const accountSection = screen.getByRole("region", { name: "Account" });
    expect(within(accountSection).getByText("Demo mode")).toBeTruthy();
    expect(
      within(accountSection).getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/login");
    expect(
      within(accountSection).getByRole("link", { name: "Create account" }).getAttribute("href"),
    ).toBe("/signup");
    expect(screen.getByText(/currency and split behavior are currently fixed/i)).toBeTruthy();
  });

  it("shows signed-out account actions when Supabase is configured", () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "",
    });

    render(<SettingsPage />);

    const accountSection = screen.getByRole("region", { name: "Account" });
    expect(screen.getByText("Signed out")).toBeTruthy();
    expect(within(accountSection).getByText("Not signed in")).toBeTruthy();
    expect(
      within(accountSection).getByText(
        "Sign in or create an account to access your saved groups and expenses.",
      ),
    ).toBeTruthy();
    expect(
      within(accountSection).getByRole("link", { name: "Sign in" }).getAttribute("href"),
    )
      .toBe("/login");
    expect(
      within(accountSection).getByRole("link", { name: "Create account" }).getAttribute("href"),
    )
      .toBe("/signup");
  });
});
