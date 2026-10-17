import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BeatDial } from "./BeatDial";

describe("T-2701 the beat dial", () => {
  it("R-11.3 one slice per beat, filled up to the beat sounding, that one in full ink", () => {
    const html = renderToString(<BeatDial beat={3} of={4} />);
    expect(html.match(/<path/g)).toHaveLength(4);
    expect(html.match(/fill-opacity="1"/g)).toHaveLength(1);
    expect(html.match(/fill-opacity="0.4"/g)).toHaveLength(2);
    expect(renderToString(<BeatDial beat={1} of={6} />).match(/<path/g)).toHaveLength(6);
  });
});
