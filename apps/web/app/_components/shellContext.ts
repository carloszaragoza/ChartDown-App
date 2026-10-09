import { createContext } from "react";

/**
 * Whether the page fills the screen without the side navigation (stand mode, the landing). Only
 * client components import it (Shell and the skeletons), so it needs no "use client" of its own.
 */
export const ShellHiddenContext = createContext(false);
