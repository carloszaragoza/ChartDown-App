export type Surface = { parentElement: Surface | null };

// A see-through layer, such as a sheet's backdrop, is passed over: the edge takes what is under it.
function isSolid(color: string): boolean {
  if (!color || color === "transparent") return false;
  const alpha = /(?:,|\/)\s*([\d.]+%?)\s*\)$/.exec(color)?.[1];
  if (!alpha) return true;
  return alpha.endsWith("%") ? parseFloat(alpha) >= 100 : parseFloat(alpha) >= 1;
}

/**
 * The color a page shows at its top edge (T-2815): the background of the first solid surface
 * at or around the given element, such as the app's header or stand mode's own screen.
 */
export function surfaceColor<T extends Surface>(
  from: T | null,
  backgroundOf: (surface: T) => string,
): string | null {
  for (let surface = from; surface; surface = surface.parentElement as T | null) {
    const color = backgroundOf(surface);
    if (isSolid(color)) return color;
  }
  return null;
}
