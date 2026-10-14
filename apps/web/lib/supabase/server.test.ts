import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));

const { readUser } = await import("./server");

const client = (claims: { sub?: string; email?: string } | null) => ({
  auth: { getClaims: vi.fn(async () => ({ data: claims ? { claims } : null })) },
});

describe("F-005 pages read who is signed in from the session's claims", () => {
  it("F-005 the claims give the person's id and email, with no call to Supabase Auth", async () => {
    const supabase = client({ sub: "u-1", email: "md@example.com" });
    expect(await readUser(supabase)).toEqual({
      data: { user: { id: "u-1", email: "md@example.com" } },
    });
    expect(supabase.auth.getClaims).toHaveBeenCalledOnce();
  });

  it("F-005 no session, or claims without a subject, is no one", async () => {
    expect(await readUser(client(null))).toEqual({ data: { user: null } });
    expect(await readUser(client({ email: "x@example.com" }))).toEqual({ data: { user: null } });
  });
});
