import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "view-as";

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled"> & {
  variant?: ButtonVariant;
  icon?: IconName;
  /** Where the icon sits. By default the next arrow goes after the text and every other icon before. */
  iconPosition?: "start" | "end";
  /** Disables the button and says why next to it (Handoff 3: a disabled button says why). */
  disabledReason?: string;
};

/** A button with text, or an icon-only button, which must have an aria-label. */
export type ButtonProps = BaseProps &
  ({ children: ReactNode } | { children?: undefined; icon: IconName; "aria-label": string });

/** Primary, secondary and "View as" buttons, at least 44 px, with a visible focus ring. */
export function Button({
  variant = "secondary",
  icon,
  iconPosition,
  disabledReason,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const position = iconPosition ?? (icon === "next" ? "end" : "start");
  const iconOnly = children === undefined;
  const classes = [
    "cd-button",
    `cd-button--${variant}`,
    iconOnly && "cd-button--icon-only",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const glyph = icon === undefined ? null : <Icon name={icon} size={20} />;

  const button = (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabledReason !== undefined}
      aria-describedby={disabledReason === undefined ? rest["aria-describedby"] : reasonId}
    >
      {position === "start" && glyph}
      {children}
      {position === "end" && glyph}
    </button>
  );
  if (disabledReason === undefined) return button;
  return (
    <span className="cd-button-group">
      {button}
      <span id={reasonId} className="cd-button__reason">
        {disabledReason}
      </span>
    </span>
  );
}
