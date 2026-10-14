/**
 * Keeps the screen on while the metronome plays (R-11.11), where the browser offers it. A phone
 * lets the lock go when the page is hidden, so it is asked for again when the page comes back.
 * Returns a function that lets it go.
 */
export function keepAwake(): () => void {
  const lock = (
    navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
    }
  ).wakeLock;
  if (!lock) return () => {};
  let held: { release(): Promise<void> } | null = null;
  let done = false;
  const ask = () => {
    if (done || document.visibilityState !== "visible") return;
    lock.request("screen").then(
      (sentinel) => {
        if (done) void sentinel.release();
        else held = sentinel;
      },
      () => {
        // Denied (low battery, no permission): the metronome still plays.
      },
    );
  };
  ask();
  document.addEventListener("visibilitychange", ask);
  return () => {
    done = true;
    document.removeEventListener("visibilitychange", ask);
    void held?.release();
    held = null;
  };
}
