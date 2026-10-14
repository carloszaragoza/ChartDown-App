import { afterEach, describe, expect, it, vi } from "vitest";
import { keepAwake } from "./wakeLock";

function fakeScreen() {
  const released: number[] = [];
  let asked = 0;
  const listeners = new Set<() => void>();
  vi.stubGlobal("navigator", {
    wakeLock: {
      request: () => {
        const id = ++asked;
        return Promise.resolve({ release: () => Promise.resolve(void released.push(id)) });
      },
    },
  });
  const doc = {
    visibilityState: "visible",
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("document", doc);
  return {
    asked: () => asked,
    released,
    show: () => listeners.forEach((listener) => listener()),
    doc,
  };
}

describe("T-1507 the screen stays on while the metronome plays", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("R-11.11 playing asks for the screen to stay on; stopping lets it go", async () => {
    const screen = fakeScreen();
    const release = keepAwake();
    await Promise.resolve();
    expect(screen.asked()).toBe(1);
    release();
    await Promise.resolve();
    expect(screen.released).toEqual([1]);
  });

  it("R-11.11 coming back to the page asks again, as the phone let it go when hidden", async () => {
    const screen = fakeScreen();
    const release = keepAwake();
    screen.show();
    await Promise.resolve();
    expect(screen.asked()).toBe(2);
    release();
  });

  it("R-11.11 without the API the metronome still plays", () => {
    vi.stubGlobal("navigator", {});
    expect(() => keepAwake()()).not.toThrow();
  });
});
