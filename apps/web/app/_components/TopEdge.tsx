"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { surfaceColor } from "../../lib/shell/topEdge";

/**
 * The screen's top edge, under a phone's status bar, shows the page's own top surface (T-2815):
 * the browser's theme color and the page behind take the color of what is at the top, such as
 * the header in light or dark or stand mode in Light or Stage, never a fixed color of their own.
 * Painted again when the page, the system's light or dark, or what is on screen changes.
 */
export function TopEdge() {
  const pathname = usePathname();
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const color = surfaceColor(
          document.elementFromPoint(window.innerWidth / 2, 1) as HTMLElement | null,
          (surface) => getComputedStyle(surface).backgroundColor,
        );
        if (!color) return;
        document.documentElement.style.background = color;
        for (const meta of document.querySelectorAll('meta[name="theme-color"]'))
          meta.setAttribute("content", color);
      });
    };
    paint();
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", paint);
    const changes = new MutationObserver(paint);
    changes.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-stand", "data-theme", "data-astryx-media"],
    });
    return () => {
      cancelAnimationFrame(frame);
      scheme.removeEventListener("change", paint);
      changes.disconnect();
    };
  }, [pathname]);
  return null;
}
