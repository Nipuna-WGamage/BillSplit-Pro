import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountControls } from "./account-controls";

const mocks = vi.hoisted(() => ({
  useGroups: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/components/groups/group-provider", () => ({
  useGroups: mocks.useGroups,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut } }),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({ error: null });
});

describe("account controls", () => {
  it("shows demo mode and accessible login and registration links", () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: false,
      userEmail: "",
    });

    render(<AccountControls />);

    expect(screen.getByText("Demo Mode")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign In" }).getAttribute("href"))
      .toBe("/login");
    expect(
      screen.getByRole("link", { name: "Create Account" }).getAttribute("href"),
    ).toBe("/signup");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("shows sign-in and create-account links when configured but signed out", () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "",
    });

    render(<AccountControls />);

    expect(screen.getByRole("link", { name: "Sign In" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create Account" })).toBeTruthy();
    expect(screen.queryByText("Demo Mode")).toBeNull();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("shows the signed-in email and signs out before redirecting to login", async () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "member@example.com",
    });
    let finishSignOut: (result: { error: null }) => void = () => undefined;
    mocks.signOut.mockReturnValue(
      new Promise((resolve) => {
        finishSignOut = resolve;
      }),
    );

    render(<AccountControls />);

    expect(screen.getByText("member@example.com")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Account menu for member@example.com",
      }),
    );
    expect(screen.getByRole("region", { name: "Account menu" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(
      screen.getByRole("button", { name: "Signing out…" }).hasAttribute("disabled"),
    ).toBe(true);

    finishSignOut({ error: null });

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/login");
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("shows a Supabase sign-out error without redirecting", async () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "member@example.com",
    });
    mocks.signOut.mockResolvedValue({
      error: { message: "Session could not be revoked" },
    });

    render(<AccountControls />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Account menu for member@example.com",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not sign out. Session could not be revoked",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows unexpected sign-out failures without redirecting", async () => {
    mocks.useGroups.mockReturnValue({
      isSupabaseMode: true,
      userEmail: "member@example.com",
    });
    mocks.signOut.mockRejectedValue(new Error("Network unavailable"));

    render(<AccountControls />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Account menu for member@example.com",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not sign out. Network unavailable",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
