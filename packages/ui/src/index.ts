// @chartdown/ui: shared components (Design Handoff 3). Import "@chartdown/ui/tokens.css",
// "@chartdown/ui/fonts.css" and "@chartdown/ui/components.css" once in the app.
export { BarRow, type BarRowProps } from "./BarRow";
export { Button, type ButtonProps, type ButtonVariant } from "./Button";
export { ChartDownLogo } from "./ChartDownLogo";
export { Icon, type IconProps } from "./Icon";
export {
  ACTION_ICONS,
  hasInstrumentIcon,
  ICONS,
  INSTRUMENT_ICONS,
  type IconName,
  type InstrumentIconName,
} from "./icons";
export { InstrumentTag, type InstrumentTagProps } from "./InstrumentTag";
// Version 1 ("Papel y tinta"): its BarRow stays available as LegacyBarRow until its screens move
// to the Astryx BarRow (E13).
export {
  Bar,
  BarRow as LegacyBarRow,
  DEFAULT_BAR_LABELS,
  type BarLabels,
  type BarProps,
  type BarRowProps as LegacyBarRowProps,
  type BarSize,
} from "./Bar";
export {
  abbreviate,
  FormStrip,
  formStripItems,
  type FormState,
  type FormStripItem,
  type FormStripLabels,
  type FormStripProps,
} from "./FormStrip";
export { MDNote, orderNotes, type MDNoteData, type MDNoteProps } from "./MDNote";
export { MDNotes, type MDNotesProps } from "./MDNotes";
export {
  NextSection,
  Section,
  type NextSectionProps,
  type SectionLabels,
  type SectionProps,
} from "./Section";
