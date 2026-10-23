"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { surfaceColor } from "../../lib/shell/topEdge";

/**
 * The screen's top edge, under a phone's status bar, shows the page's own top surface (T-2815):
 * the browser's theme color and the page behind take the color of what is at the top, such as
 * the header in light or dark or stand mode in Light or Stage, never a fixed color of their own.
 * Painted again when the page, the system's light or dark, or what is on screen changes.
 *
 * Since iOS 26 Safari ignores the theme color: it tints the status bar from a fixed, solid strip
 * across at least 80 % of the top and blurs what is under it otherwise, as on an iPad, where the
 * side navigation leaves the content under that (T-2827). So the edge is also a strip of its own,
 * as tall as the status bar, that taps and the reading above pass through, on touch screens only.
 */
export function TopEdge() {
  const pathname = usePathname();
  const [edge, setEdge] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const color = surfaceColor(
          document.elementFromPoint(window.innerWidth / 2, 1) as HTMLElement | null,
          (surface) => getComputedStyle(surface).backgroundColor,
          (surface) => surface.getBoundingClientRect().width >= window.innerWidth / 2,
        );
        if (!color) return;
        setEdge(navigator.maxTouchPoints > 0 ? color : null);
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
  if (!edge) return null;
  return (
    <div
      aria-hidden
      data-top-edge
      style={{
        position: "fixed",
        insetBlockStart: 0,
        insetInline: 0,
        blockSize: "max(6px, env(safe-area-inset-top))",
        background: edge,
        pointerEvents: "none",
        zIndex: 2147483647,
      }}
    />
  );
}
