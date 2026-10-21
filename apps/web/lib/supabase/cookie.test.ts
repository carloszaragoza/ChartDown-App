import { describe, expect, it } from "vitest";
import { authCookie } from "./cookie";

describe("T-2818 the session cookie on chartdown.app's own domain", () => {
  it("R-01.1 keeps the project's own name, so moving to auth.chartdown.app signs no one out", () => {
    expect(authCookie("nkuvzazyfcqbaefthykq")).toEqual({
      cookieOptions: { name: "sb-nkuvzazyfcqbaefthykq-auth-token" },
    });
  });

  it("R-01.1 without a project ref the library's own name holds", () => {
    expect(authCookie("")).toEqual({});
  });
});
