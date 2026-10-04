import { Icon } from "./Icon";
import { hasInstrumentIcon } from "./icons";

export interface InstrumentTagProps {
  /** The instrument id from the catalog, for example "bass" (R-00.1). */
  instrument: string;
  /** The instrument's name in the interface language, for example "Bass" or "Bajo". */
  label: string;
  /** Default: icon and name. Compact: a 44 px square with the icon only, for tight spaces. */
  variant?: "default" | "compact";
}

/**
 * The red-pencil label naming who an MD note or cue is for (Design Handoff 3). Instruments
 * are told apart by name and shape, never by color. An instrument without an icon yet shows
 * its name only.
 */
export function InstrumentTag({ instrument, label, variant = "default" }: InstrumentTagProps) {
  const icon = hasInstrumentIcon(instrument) ? instrument : undefined;
  if (variant === "compact" && icon !== undefined) {
    return (
      <span className="cd-tag cd-tag--compact" role="img" aria-label={label} title={label}>
        <Icon name={icon} size={22} />
      </span>
    );
  }
  return (
    <span className={variant === "compact" ? "cd-tag cd-tag--compact cd-tag--name-only" : "cd-tag"}>
      {icon !== undefined && <Icon name={icon} size={16} />}
      {label}
    </span>
  );
}
