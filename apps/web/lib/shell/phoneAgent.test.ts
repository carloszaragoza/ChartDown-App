import { describe, expect, it } from "vitest";
import { isPhoneAgent, PHONE_QUERY } from "./phoneAgent";

describe("R-03.8 the server's guess that a page opens on a phone", () => {
  it("R-03.8 an iPhone or an Android phone is a phone; an iPad, an Android tablet or a Mac is not", () => {
    expect(
      isPhoneAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
    expect(
      isPhoneAgent(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
      ),
    ).toBe(true);
    expect(
      isPhoneAgent(
        "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      isPhoneAgent(
        "Mozilla/5.0 (Linux; Android 15; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isPhoneAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      ),
    ).toBe(false);
    expect(isPhoneAgent(null)).toBe(false);
  });

  it("R-03.8 a phone is narrower than 600 px, or shorter than 500 px when held sideways", () => {
    expect(PHONE_QUERY).toBe("(max-width: 599px), (max-height: 499px)");
  });
});
