// Stand mode's Light or Stage (R-03.12, T-3031): the device's own appearance until the person
// chooses, then their choice, kept on the device in a cookie so the server paints it at once.

/** Light, or Stage for a dark stage. */
export type StandTheme = "light" | "stage";

/** What stand mode shows: a theme, or the device's appearance until one is chosen. */
export type StandThemeChoice = StandTheme | "device";

export const STAND_THEME_COOKIE = "cd-stand-theme";

const isTheme = (value: string | null | undefined): value is StandTheme =>
  value === "light" || value === "stage";

/** A link that names a theme shows it; otherwise the one chosen on the device; else the device. */
export function standThemeOf(
  asked: string | null | undefined,
  saved: string | null | undefined,
): StandThemeChoice {
  if (isTheme(asked)) return asked;
  if (isTheme(saved)) return saved;
  return "device";
}

/** The device's dark appearance shows Stage, its light one Light. */
export const themeOnDevice = (choice: StandThemeChoice, isDark: boolean): StandTheme =>
  choice === "device" ? (isDark ? "stage" : "light") : choice;

/** Keeps the person's choice on this device, for a year. */
export function rememberStandTheme(theme: StandTheme): void {
  document.cookie = `${STAND_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/** The choice kept on this device, read in the browser (a downloaded set has no server). */
export function savedStandTheme(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${STAND_THEME_COOKIE}=`))
    ?.split("=")[1];
}
