/** How far a finger must travel sideways for a swipe to turn the section, in CSS pixels. */
export const SWIPE_DISTANCE = 50;

/**
 * What a finger's move on the chart asks for (R-03.3): a mostly sideways swipe to the left is the
 * next section and to the right the previous one; anything mostly vertical is a scroll.
 */
export function swipeTurn(dx: number, dy: number): "next" | "previous" | null {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) return null;
  return dx < 0 ? "next" : "previous";
}

/** Whether the touch began inside something that scrolls sideways itself, such as a wide row. */
export function inSidewaysScroll(target: EventTarget | null, until: Element): boolean {
  for (let node = target instanceof Element ? target : null; node && node !== until;) {
    if (node.scrollWidth > node.clientWidth + 1) return true;
    node = node.parentElement;
  }
  return false;
}
