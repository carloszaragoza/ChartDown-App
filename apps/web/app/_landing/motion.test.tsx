import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadQuote } from "./motion";

describe("T-2853 the landing hydrates cleanly with reduced motion", () => {
  it("T-2853 the founder's quote is drawn word by word for everyone, with no reduced-motion branch", () => {
    const text = "One chart, every player's cues.";
    const html = renderToString(<ReadQuote text={text} />);
    expect(html.match(/<span/g)).toHaveLength(text.split(" ").length);
  });
});
