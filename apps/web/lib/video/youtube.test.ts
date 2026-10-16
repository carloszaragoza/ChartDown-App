import { describe, expect, it } from "vitest";
import { startSeconds, videoId } from "./youtube";

describe("T-2501 a YouTube link as its video", () => {
  it("R-03.11 a YouTube address gives its video id", () => {
    expect(videoId("https://www.youtube.com/watch?v=hBL9EBKB5DI")).toBe("hBL9EBKB5DI");
    expect(videoId("https://youtu.be/hBL9EBKB5DI?si=abc")).toBe("hBL9EBKB5DI");
    expect(videoId("https://m.youtube.com/watch?v=hBL9EBKB5DI&t=30")).toBe("hBL9EBKB5DI");
    expect(videoId("https://www.youtube.com/shorts/hBL9EBKB5DI")).toBe("hBL9EBKB5DI");
    expect(videoId("https://www.youtube.com/embed/hBL9EBKB5DI")).toBe("hBL9EBKB5DI");
  });

  it("R-03.11 anything else gives none", () => {
    expect(videoId("https://www.youtube.com/@chartdown")).toBeNull();
    expect(videoId("https://example.com/watch?v=hBL9EBKB5DI")).toBeNull();
    expect(videoId("http://www.youtube.com/watch?v=hBL9EBKB5DI")).toBeNull();
    expect(videoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(videoId("not a link")).toBeNull();
  });

  it("R-03.11 a link's t= is where it starts", () => {
    expect(startSeconds("https://youtu.be/hBL9EBKB5DI?t=90")).toBe(90);
    expect(startSeconds("https://www.youtube.com/watch?v=hBL9EBKB5DI&t=1m30s")).toBe(90);
    expect(startSeconds("https://www.youtube.com/watch?v=hBL9EBKB5DI")).toBe(0);
  });
});
