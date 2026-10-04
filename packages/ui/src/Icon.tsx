import { ICONS, type IconName } from "./icons";

export interface IconProps {
  name: IconName;
  /** Pixel size: 20 in buttons, 24 standing alone, 16 in a tag, 22 in a compact tag. */
  size?: number;
  /** For an icon standing alone. Without it the icon is decorative and hidden from assistive tech. */
  label?: string;
}

/** A ChartDown stroke icon (Design Handoff 3). Icons sit beside words; they never replace them. */
export function Icon({ name, size = 24, label }: IconProps) {
  const a11y = label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label };
  return (
    <svg
      className="cd-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      focusable="false"
      {...a11y}
      // The markup is the design system's own drawing, a constant of this package.
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
