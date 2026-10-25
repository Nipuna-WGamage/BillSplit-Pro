import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/app/auth/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

afterEach(cleanup);

describe("authentication forms", () => {
  it("explains missing Supabase configuration and disables login", () => {
    render(<AuthForm mode="login" isSupabaseConfigured={false} />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Authentication is unavailable because Supabase is not configured.",
    );
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled"))
      .toBe(true);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href"))
      .toBe("/signup");
  });

  it("allows registration when Supabase is configured and links back to login", () => {
    render(<AuthForm mode="signup" isSupabaseConfigured />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create account" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href"))
      .toBe("/login");
  });
});
