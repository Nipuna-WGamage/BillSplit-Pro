import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, redirect, supabase } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/config", () => ({
  getSiteUrl: () => "https://billsplit.example",
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { requestPasswordReset, updatePassword } from "./actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("password recovery actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("validates reset email input before contacting Supabase", async () => {
    const result = await requestPasswordReset({}, formData({ email: "invalid" }));

    expect(result).toEqual({ error: "Enter a valid email address." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sends a normalized reset email to the verified callback", async () => {
    const result = await requestPasswordReset(
      {},
      formData({ email: " Member@Example.com " }),
    );

    expect(result.message).toContain("If an account exists");
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "member@example.com",
      {
        redirectTo:
          "https://billsplit.example/auth/callback?next=%2Fauth%2Freset-password",
      },
    );
  });

  it("reports reset email delivery failures", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: "Email provider unavailable" },
    });

    const result = await requestPasswordReset(
      {},
      formData({ email: "member@example.com" }),
    );

    expect(result.error).toContain("Email provider unavailable");
  });

  it("rejects mismatched passwords before checking the session", async () => {
    const result = await updatePassword(
      {},
      formData({ password: "password123", confirmPassword: "different123" }),
    );

    expect(result).toEqual({ error: "The passwords do not match." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not change a password without an authenticated recovery session", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await updatePassword(
      {},
      formData({ password: "newpassword123", confirmPassword: "newpassword123" }),
    );

    expect(result.error).toContain("invalid or expired");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates a password and redirects only after Supabase succeeds", async () => {
    await expect(
      updatePassword(
        {},
        formData({
          password: "newpassword123",
          confirmPassword: "newpassword123",
        }),
      ),
    ).rejects.toThrow("redirect:/");

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "newpassword123",
    });
  });
});
