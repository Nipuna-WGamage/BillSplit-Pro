import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { proxy } from "./proxy";

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("authentication proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    mocks.createServerClient.mockReset();
    mocks.getClaims.mockReset();
    mocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: null,
    });
    mocks.createServerClient.mockReturnValue({
      auth: { getClaims: mocks.getClaims },
    });
  });

  it("redirects signed-out users away from private pages", async () => {
    const response = await proxy(request("/groups/private"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fgroups%2Fprivate",
    );
    expect(mocks.getClaims).toHaveBeenCalled();
  });

  it("protects private pages when session verification fails", async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: { message: "Invalid or expired session" },
    });

    const response = await proxy(request("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=%2F");
  });

  it.each(["/login", "/signup", "/forgot-password", "/auth/callback?code=test"])(
    "allows signed-out access to %s",
    async (path) => {
      const response = await proxy(request(path));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("redirects signed-in users from login to the dashboard", async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });

    const response = await proxy(request("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("keeps demo routes available without Supabase configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await proxy(request("/groups"));

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
