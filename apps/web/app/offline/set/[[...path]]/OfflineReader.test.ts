import { describe, expect, it } from "vitest";
import { readPlace } from "./OfflineReader";

describe("R-08.2 the offline reader's addresses", () => {
  it("R-08.2 the list, a set, a song and its stand mode", () => {
    expect(readPlace("/offline/set")).toEqual({ kind: "list" });
    expect(readPlace("/offline/set/s1")).toEqual({ kind: "set", setId: "s1" });
    expect(readPlace("/offline/set/s1/3")).toEqual({
      kind: "song",
      setId: "s1",
      position: 3,
      stand: false,
    });
    expect(readPlace("/offline/set/s1/3/stand")).toEqual({
      kind: "song",
      setId: "s1",
      position: 3,
      stand: true,
    });
    expect(readPlace("/offline/set/s1/zero")).toEqual({ kind: "set", setId: "s1" });
  });
});
